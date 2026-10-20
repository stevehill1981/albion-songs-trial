import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Client} from '@modelcontextprotocol/client';
import {InMemoryTransport} from '@modelcontextprotocol/server';
import {buildMatchIndex} from '../scripts/build-match-index.mjs';
import {createMuseumClient,REPOSITORY} from '../auth/mcp/github.mjs';
import {createMuseumServer} from '../auth/mcp/server.mjs';
const revision='a'.repeat(40),token='unit_test_research_credential_only';
const directory=await mkdtemp(join(tmpdir(),'albion-research-tools-'));let built;
try{built=await buildMatchIndex({revision,output:directory});}finally{await rm(directory,{recursive:true,force:true});}
function harness(){
 let allowed=true,stale=false;const calls=[];
 const museum=createMuseumClient(token,async(url,init={})=>{
  calls.push(url);assert.equal(init.method||'GET','GET','Research must never write');
  if(url===`https://api.github.com/repos/${REPOSITORY}`){assert.equal(init.headers.Authorization,`Bearer ${token}`);return Response.json({permissions:{push:allowed}});}
  assert.equal(init.headers?.Authorization,undefined,'Archive reads must not forward GitHub credentials');
  const parsed=new URL(url);assert.equal(parsed.origin,'https://albion-songs-trial.steve-e85.workers.dev');
  if(parsed.pathname==='/version.json')return Response.json({revision:stale?'b'.repeat(40):revision});
  if(parsed.pathname==='/data/museum-query/manifest.json')return Response.json(built.manifest);
  const content=built.files.get(parsed.pathname.replace('/data/museum-query/',''));assert(content,'Only published snapshot assets may be fetched');return new Response(content);
 });
 return {museum,calls,set(values){({allowed=allowed,stale=stale}=values);}};
}
async function connect(h){
 const server=createMuseumServer({client:h.museum}),client=new Client({name:'Research acceptance',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(a);await client.connect(b);return {client,close:async()=>{await client.close();await server.close();}};
}
test('all research tools require fresh editor access before any archive fetch',async()=>{
 const h=harness();
 const operations=[()=>h.museum.archiveCoverage({}),()=>h.museum.archiveMatches({ledger:'annulled'}),()=>h.museum.archiveSummary({ledger:'wartime'}),()=>h.museum.managerList(),()=>h.museum.managerProfile({id:'darren-moore'})];
 h.set({allowed:false});for(const operation of operations)await assert.rejects(operation(),/editor access/);
 assert.equal(h.calls.length,5);assert(h.calls.every(url=>url.startsWith('https://api.github.com/')));
 h.set({allowed:true});assert.equal((await h.museum.managerList()).managers.length,3);
 h.set({allowed:false});const before=h.calls.length;await assert.rejects(h.museum.managerList(),/editor access/);assert.equal(h.calls.length,before+1);
 h.set({allowed:true});await h.museum.managerProfile({id:'darren-moore'});await h.museum.managerProfile({id:'darren-moore'});
 h.set({allowed:false});const warm=h.calls.length;await assert.rejects(h.museum.managerProfile({id:'darren-moore'}),/editor access/);assert.equal(h.calls.length,warm+1,'A warm public-file cache must not bypass authorization');
});
test('research protocol preserves ledger evidence, pagination and calculated manager results',async()=>{
 const h=harness(),connection=await connect(h),call=async(name,args={})=>{const response=await connection.client.callTool({name,arguments:args});assert(!response.isError,JSON.stringify(response));return response.structuredContent;};
 try{
  const tools=(await connection.client.listTools()).tools;for(const name of ['archive_coverage','search_matches','match_statistics','list_managers','read_manager'])assert.equal(tools.find(t=>t.name===name).annotations.readOnlyHint,true);
  const coverage=await call('archive_coverage');assert.equal(coverage.ledgers.competitive.summary.played,5842);assert.equal(coverage.ledgers.wartime.summary.played,266);assert.equal(coverage.ledgers.annulled.summary.played,3);assert.equal(coverage.summary,undefined,'No combined all-ledger total');
  const profile=await call('read_manager',{id:'darren-moore'}),summary=await call('match_statistics',{ledger:'competitive',manager:'darren-moore'});assert.deepEqual(summary.summary,profile.summary);
  const matches=await call('search_matches',{ledger:'competitive',tenure:'darren-moore-caretaker-2018'});assert.equal(matches.matches.length,6);assert.equal(matches.matches.filter(m=>m.outcome==='W').length,3);assert.equal(matches.summary.W,3);assert(matches.matches.every(m=>m.sourceRecord.url));
  const wartime=await call('search_matches',{ledger:'wartime',season:'1942-43'});assert.equal(wartime.summary.played,38);assert(wartime.matches.every(m=>m.ledger==='wartime'));assert.equal(wartime.nextPage,2);assert(wartime.summary.evidence['single-source']>0);
  const warning=await call('read_manager',{id:'tony-mowbray'});assert(JSON.stringify(warning).includes('139'));assert(JSON.stringify(warning).includes('140'));
  let page=1,rows=[];do{const result=await call('archive_coverage',{ledger:'competitive',scope:'season',page});assert(result.scopes.length<=50);rows.push(...result.scopes);page=result.nextScopePage;}while(page);
  const catalog=JSON.parse(built.files.get(built.manifest.ledgers.competitive.path));assert.deepEqual(rows.map(r=>r.value),catalog.groups.filter(g=>g.scope==='season').map(g=>g.value));assert.equal(new Set(rows.map(r=>r.value)).size,rows.length);
 }finally{await connection.close();}
});
test('research protocol rejects typo filters, merged ledgers, broad queries and stale assets explicitly',async()=>{
 const h=harness(),connection=await connect(h);
 try{
  for(const args of [{ledger:'all'},{ledger:'competitive',competiton:'League'},{ledger:'competitive',page:0}]){const before=h.calls.length;const result=await connection.client.callTool({name:'search_matches',arguments:args});assert.equal(result.isError,true);assert.equal(h.calls.length,before,'Invalid protocol arguments must not reach the archive');}
  const broad=await connection.client.callTool({name:'match_statistics',arguments:{ledger:'competitive',from:'2000-01-01'}});assert.equal(broad.isError,true);assert(broad.content[0].text.includes('too broad'));assert(!broad.structuredContent);
  const unknown=await connection.client.callTool({name:'read_manager',arguments:{id:'missing'}});assert.equal(unknown.isError,true);assert(unknown.content[0].text.includes('no researched profile'));
  h.set({stale:true});const stale=await connection.client.callTool({name:'match_statistics',arguments:{ledger:'annulled'}});assert.equal(stale.isError,true);assert(stale.content[0].text.includes('out of sync'));
 }finally{await connection.close();}
});
