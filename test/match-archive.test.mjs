import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {adaptArchive,archiveGroups,matchSummary,validateQuery,planQuery,refineMatches,PAGE_SIZE} from '../src/lib/match-archive.mjs';
import {buildMatchIndex,ARCHIVE_FILES,sha256} from '../scripts/build-match-index.mjs';
import {createArchiveClient} from '../auth/mcp/archive.mjs';
import {attributeManagers} from '../src/lib/manager-history.mjs';
import {summarize} from '../public/results-core.mjs';
const revision='a'.repeat(40);
const originals=Object.fromEntries(await Promise.all(Object.entries(ARCHIVE_FILES).map(async([ledger,path])=>[ledger,await readFile(new URL('../'+path,import.meta.url),'utf8')])));
const archives=Object.fromEntries(Object.entries(originals).map(([k,v])=>[k,adaptArchive(k,JSON.parse(v))]));
const records=async folder=>Promise.all((await readdir(folder)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(`${folder}/${f}`,'utf8'))));
archives.competitive=attributeManagers(archives.competitive,{managers:await records('content/managers'),tenures:await records('content/manager-tenures')});
const output=await mkdtemp(join(tmpdir(),'albion-index-test-'));
let built;
try{built=await buildMatchIndex({revision,output});}finally{await rm(output,{recursive:true,force:true});}
function harness({denied=false,stale=false,corrupt=false,missing=false}={}){
 const calls=[];
 const fetcher=async(url,init)=>{
  assert.equal(init.headers?.Authorization,undefined);assert.equal(init.redirect,'manual');const path=new URL(url).pathname;calls.push(path);
  if(path==='/version.json')return Response.json({revision:stale?'b'.repeat(40):revision});
  if(path.endsWith('/manifest.json'))return Response.json(built.manifest);
  const text=built.files.get(path.replace('/data/museum-query/',''));
  if(missing||!text)return new Response('',{status:404});return new Response(corrupt?text+' ':text);
 };
 return {client:createArchiveClient(fetcher),calls};
}
test('each ledger preserves original facts, source lineage and disjoint season totals',()=>{
 for(const [ledger,archive]of Object.entries(archives)){
  const data=JSON.parse(originals[ledger]);assert.equal(archive.matches.length,data.matches.length);assert.equal(new Set(archive.matches.map(m=>m.id)).size,data.matches.length);
  const total=matchSummary(archive.matches);assert.deepEqual(Object.fromEntries(Object.keys(summarize(data.matches)).map(k=>[k,total[k]])),summarize(data.matches));
  const seasons=archiveGroups(archive).filter(g=>g.scope==='season').map(g=>matchSummary(g.matches));
  for(const key of ['played','W','D','L','gf','ga'])assert.equal(seasons.reduce((sum,s)=>sum+s[key],0),total[key]);
  for(const row of archive.matches){const original=data.matches.find(m=>(m.id||[m.date,m.home,m.away,m.competition].join('|'))===row.originalId);for(const key of Object.keys(original).filter(k=>k!=='id'))assert.deepEqual(row[key],original[key]);assert(row.id.startsWith(ledger+':'));assert(row.sourceRecord.url);}
 }
 assert.equal(matchSummary(archives.wartime.matches).evidence['single-source'],197);
 assert.equal(matchSummary(archives.competitive.matches).evidence.unclassified,5842);
});
test('bad ledgers, missing source lookup, duplicate IDs, invalid filters and unknown scopes fail explicitly',()=>{
 const data=JSON.parse(originals.competitive);data.matches[0].source='missing';assert.throws(()=>adaptArchive('competitive',data),/unresolved/);
 const duplicate=JSON.parse(originals.wartime);duplicate.matches.push(duplicate.matches[0]);assert.throws(()=>adaptArchive('wartime',duplicate),/Duplicate/);
 for(const q of [{},{ledger:'all'},{ledger:'competitive',competiton:'League'},{ledger:'competitive',from:'2025-02-30'},{ledger:'wartime',outcome:'win'},{ledger:'wartime',page:0}])assert.throws(()=>validateQuery(q));
 const catalog=JSON.parse(built.files.get(built.manifest.ledgers.competitive.path));
 assert.throws(()=>planQuery(catalog,{ledger:'competitive',season:'1878-79'}),/Unknown season/);
 assert.throws(()=>planQuery(catalog,{ledger:'competitive',venue:'H'}),/too broad/);
});
test('derived snapshot is bounded, content addressed, complete, and leaves canonical bytes untouched',async()=>{
 for(const [path,text]of built.files){assert.equal(path,`files/${sha256(text)}.json`);assert(Buffer.byteLength(text)<=192*1024);}
 for(const [ledger,archive]of Object.entries(archives)){
  const catalog=JSON.parse(built.files.get(built.manifest.ledgers[ledger].path));
  for(const group of catalog.groups){const descriptor=JSON.parse(built.files.get(group.descriptor.path));const rows=descriptor.parts.flatMap(part=>JSON.parse(built.files.get(part.path)).matches);assert.equal(rows.length,group.count);assert.equal(new Set(rows.map(m=>m.id)).size,rows.length);assert.deepEqual(matchSummary(rows),descriptor.summary);assert.deepEqual(rows,group.scope==='all'?archive.matches:archive.matches.filter(m=>m[group.scope]===group.value));}
  assert.equal(await readFile(new URL('../'+ARCHIVE_FILES[ledger],import.meta.url),'utf8'),originals[ledger]);
 }
});
test('remote pagination traverses an entire season without gaps, and calculations agree with searched rows',async()=>{
 const h=harness();const query={ledger:'competitive',season:'2025-26'};const expected=archives.competitive.matches.filter(m=>m.season===query.season),rows=[];
 let page=1;do{const result=await h.client.matches({...query,page});rows.push(...result.matches);page=result.nextPage;}while(page);
 assert.deepEqual(rows,expected);const result=await h.client.summary(query);assert.deepEqual(result.summary,matchSummary(rows));assert.equal(result.sourceSha256,sha256(originals.competitive));
 const restricted={...query,competition:'League',venue:'H',outcome:'W'};assert.deepEqual((await h.client.summary(restricted)).summary,matchSummary(refineMatches(expected,restricted)));
 const zero=await h.client.matches({...query,from:'1800-01-01',to:'1800-01-02'});assert.equal(zero.summary.played,0);assert.equal(zero.summary.winPercent,null);assert.deepEqual(zero.matches,[]);
 assert.equal((await h.client.summary({ledger:'competitive',season:'2018-19',opponent:'Villa',competition:'Play-offs / test matches'})).summary.W,1,'The extra-time play-off win remains a match win regardless of the lost shootout');
 assert.equal((await h.client.summary({ledger:'annulled'})).summary.played,3);
 assert.equal((await h.client.summary({ledger:'wartime',season:'1942-43'})).summary.played,archives.wartime.matches.filter(m=>m.season==='1942-43').length);
 assert.equal((await h.client.matches(query)).matches.length,PAGE_SIZE);
});
test('source notes and discrepancies are available; stale, missing, corrupt and out-of-range assets fail closed',async()=>{
 const coverage=await harness().client.coverage({ledger:'wartime'});assert.deepEqual(coverage.pending,archives.wartime.pending);assert.deepEqual(coverage.coverageNotes,archives.wartime.coverageNotes);
 for(const options of [{stale:true},{corrupt:true},{missing:true}])await assert.rejects(harness(options).client.summary({ledger:'wartime'}));
 await assert.rejects(harness().client.matches({ledger:'annulled',page:2}),/outside/);
 const h=harness();await assert.rejects(h.client.summary({ledger:'competitive',from:'2000-01-01'}),/too broad/);assert(h.calls.length<=4);
});

test('manager queries reconcile with profiles and carry unresolved total warnings',async()=>{
 const h=harness();const people=await h.client.managers();assert.equal(people.managers.length,3);
 const profile=await h.client.manager({id:'darren-moore'}),summary=await h.client.summary({ledger:'competitive',manager:'darren-moore'});
 assert.deepEqual(summary.summary,profile.summary);
 const caretaker=await h.client.matches({ledger:'competitive',tenure:'darren-moore-caretaker-2018'});assert.equal(caretaker.matches.length,6);assert.equal(caretaker.summary.W,3);
 const second=await h.client.matches({ledger:'competitive',manager:'tony-mowbray',from:'2025-01-01'});assert.equal(second.summary.played,17);assert(second.matches.every(m=>m.date!=='2025-01-18'));
 assert((await h.client.summary({ledger:'competitive',manager:'tony-mowbray'})).warnings.some(n=>n.includes('139')&&n.includes('140')));
 assert((await h.client.summary({ledger:'competitive',manager:'unassigned'})).warnings.some(n=>n.includes('Do not invent')));
 await assert.rejects(h.client.manager({id:'missing'}),/no researched/);
 await assert.rejects(h.client.summary({ledger:'wartime',manager:'darren-moore'}),/Unknown/);
});
