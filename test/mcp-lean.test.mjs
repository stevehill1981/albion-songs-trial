import test from 'node:test';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';
import {InMemoryTransport} from '@modelcontextprotocol/server';
import {createMuseumServer,createLeanMuseumServer} from '../auth/mcp/server.mjs';
import {MuseumError} from '../auth/mcp/github.mjs';
const revision='a'.repeat(40);
const cases=[
 ['museum_guide','guide',{}],['read_block_schema','schema',{type:'manager-performance'}],
 ['list_content','list',{kind:'pages'}],['read_content','read',{kind:'pages',id:'songs'}],['list_drafts','drafts',{}],
 ['save_draft','save',{kind:'pages',id:'songs',document:{title:'Songs'},baseRevision:revision}],
 ['get_draft_status','status',{draftNumber:17}],
 ['publish_draft','publish',{draftNumber:17,expectedCommit:revision,baseRevision:revision,confirmation:'Publish this previewed revision'}],
 ['publication_status','publication',{revision}],['archive_coverage','archiveCoverage',{}],
 ['search_matches','archiveMatches',{ledger:'wartime',season:'1942-43'}],['match_statistics','archiveSummary',{ledger:'competitive'}],
 ['list_managers','managerList',{}],['read_manager','managerProfile',{id:'darren-moore'}]
];
async function connected(factory,museum){
 const server=factory({client:museum}),client=new Client({name:'Parity acceptance',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);}catch(error){await client.close();await server.close();throw error;}
 return {server,client,close:async()=>{await client.close();await server.close();}};
}
function adapter(owner,calls){return Object.fromEntries(cases.map(([,method])=>[method,async args=>{calls.push({owner,method,args});return {owner,method,args};}]));}
test('lean prototype preserves complete discovery and every validated operation',async()=>{
 const calls=[[],[]],connections=[];
 try{
  for(const [index,factory]of [createMuseumServer,createLeanMuseumServer].entries())connections.push(await connected(factory,adapter('user_a',calls[index])));
  assert.deepEqual(connections[1].client.getServerCapabilities(),connections[0].client.getServerCapabilities());
  assert.equal(connections[1].client.getInstructions(),connections[0].client.getInstructions());
  assert.deepEqual(await connections[1].client.listTools(),await connections[0].client.listTools());
  for(const [name,,args]of cases){
   const results=await Promise.all(connections.map(({client})=>client.callTool({name,arguments:args})));
   assert(!results[0].isError,JSON.stringify(results[0]));assert.deepEqual(results[1],results[0],name);
  }
  assert.deepEqual(calls[1],calls[0]);assert.equal(calls[1].length,14);
  assert.deepEqual(calls[1].find(c=>c.method==='drafts').args,{page:1});
  assert.deepEqual(calls[1].find(c=>c.method==='status').args,{draftNumber:17,includeContent:false});
  assert.equal(calls[1].find(c=>c.method==='archiveMatches').args.page,1);
 }finally{for(const c of connections)await c.close();}
});
test('lean and baseline reject invalid input before operations, preserve stripping and strict research filters',async()=>{
 const connections=[],calls=[[],[]];
 try{
  for(const [index,factory]of [createMuseumServer,createLeanMuseumServer].entries())connections.push(await connected(factory,adapter('user_a',calls[index])));
  for(const [name,args]of [
   ['list_content',{kind:'data'}],['list_drafts',{page:0}],['list_drafts',{page:101}],
   ['publish_draft',{draftNumber:17,expectedCommit:revision,baseRevision:revision,confirmation:'Do whatever'}],
   ['save_draft',{kind:'pages',id:'songs',document:{},baseRevision:'wrong'}],
   ['search_matches',{ledger:'all'}],['search_matches',{ledger:'wartime',competiton:'League'}],
   ['match_statistics',{ledger:'competitive',page:1}],['read_manager',{id:'../secret'}]
  ]){
   const results=await Promise.all(connections.map(({client})=>client.callTool({name,arguments:args})));
   assert.equal(results[0].isError,true);assert.deepEqual(results[1],results[0],name);
  }
  assert.deepEqual(calls,[[],[]],'Invalid arguments must not reach any operation');
  const results=await Promise.all(connections.map(({client})=>client.callTool({name:'list_content',arguments:{kind:'pages',ignored:'extra'}})));
  assert.deepEqual(results[1],results[0]);assert.deepEqual(calls[1][0].args,{kind:'pages'});
  for(const name of ['not-a-tool','toString','constructor','__proto__'])for(const {client}of connections){
   await assert.rejects(client.callTool({name,arguments:{}}),error=>error.code===-32602);
  }
  assert.equal(calls[0].length,1);assert.equal(calls[1].length,1);
 }finally{for(const c of connections)await c.close();}
});
test('lean prototype keeps errors bounded and concurrent clients isolated without caching permission or results',async()=>{
 for(const factory of [createMuseumServer,createLeanMuseumServer]){
  const connections=[];let allowed=true;const seen=[];
  try{
   for(const owner of ['user_a','user_b'])connections.push(await connected(factory,{drafts:async({page})=>{await new Promise(resolve=>setImmediate(resolve));seen.push(owner);if(!allowed)throw new MuseumError('Museum editor access is required.');return {owner,page};},list:async()=>{throw Error('private upstream detail');}}));
   const results=await Promise.all(connections.map(({client})=>client.callTool({name:'list_drafts',arguments:{}})));
   assert.deepEqual(results.map(r=>r.structuredContent),[{owner:'user_a',page:1},{owner:'user_b',page:1}]);
   allowed=false;
   for(const {client}of connections){
    const denied=await client.callTool({name:'list_drafts',arguments:{}});assert.equal(denied.isError,true);assert(denied.content[0].text.includes('editor access'));
    const failed=await client.callTool({name:'list_content',arguments:{kind:'pages'}});assert.equal(failed.isError,true);assert(!JSON.stringify(failed).includes('private upstream detail'));
   }
   assert.equal(seen.length,4,'Each repeated operation must recheck access');
  }finally{for(const c of connections)await c.close();}
 }
});

test('baseline packaging requires explicit comparison opt-in and unknown selectors fail',()=>{
 for(const [script,selector,args]of [['scripts/cloudflare-output.mjs','baseline',['--auth']],['scripts/build-auth.mjs','unknown',[]],['scripts/cloudflare-output.mjs','unknown',['--auth','--hosted-comparison']]]){
  const result=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{...process.env,ALBION_MCP_HANDLER:selector}});
  assert.equal(result.status,1);assert.match(result.stderr,script.includes('cloudflare-output')?/baseline handler needs --hosted-comparison/:/Choose baseline or lean/);
 }
});
