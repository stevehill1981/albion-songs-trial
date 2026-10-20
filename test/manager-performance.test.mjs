import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadManagerContent} from '../src/lib/manager-content.mjs';
import {performanceView,renderManagerPerformance} from '../src/lib/manager-performance.mjs';
import {validateBlock,renderPageContent} from '../src/lib/blocks.mjs';
import {preparePreviewRequest} from '../src/lib/preview-request.mjs';
import {summarize} from '../public/results-core.mjs';
import {buildMatchIndex} from '../scripts/build-match-index.mjs';
const managerContent=await loadManagerContent(),context={managerPerformance:managerContent.performance};
const block={type:'manager-performance',anchor:'performance',navLabel:'',heading:'Recorded results',manager:'darren-moore'};
const page=JSON.parse(await readFile('content/pages/manager-darren-moore.json','utf8'));
const records=JSON.parse(await readFile('public/data/results.json','utf8'));
test('performance rows agree with independent fixture totals and lookup assets, not editable page prose',async()=>{
 const view=performanceView(block,context),totals=summarize(records.matches.filter(m=>m.date>='2018-04-07'&&m.date<='2019-03-09'));
 for(const [key,value]of Object.entries(totals))assert.equal(view.profile.summary[key],value);
 assert.equal(view.rows.length,3);assert.equal(view.rows[0].summary.played,6);assert.match(view.rows[0].label,/Caretaker/);
 const output=await mkdtemp(join(tmpdir(),'albion-performance-index-'));
 try{const {manifest,files}=await buildMatchIndex({revision:'a'.repeat(40),output});for(const person of manifest.managers){const profile=JSON.parse(files.get(person.profile.path));assert.deepEqual(profile.summary,context.managerPerformance.profiles[person.id].summary);assert.deepEqual(profile.tenures,context.managerPerformance.profiles[person.id].tenures);}}finally{await rm(output,{recursive:true,force:true});}
 const rendered=renderManagerPerformance(block,context);assert.match(rendered,/Match records and source credits/);assert.match(rendered,/19 Oct 2026/);for(const t of view.profile.tenures)for(const source of t.sources)assert(rendered.includes(source.url));
 assert.throws(()=>validateBlock({...block,played:999}),/unexpected field/);assert.throws(()=>performanceView({...block,manager:'missing'},context),/published manager/);
});
test('switching manager changes figures and warnings; repeat spells stay separate and text is escaped',()=>{
 const changed={...block,manager:'tony-mowbray'},view=performanceView(changed,context),html=renderManagerPerformance(changed,context);
 assert.equal(view.rows.length,3);assert.equal(view.rows[1].summary.played,17);assert.match(html,/139/);assert.match(html,/140/);assert.match(html,/Open research question/);assert.notEqual(view.profile.summary.played,performanceView(block,context).profile.summary.played);
 const untrusted=structuredClone(context);untrusted.managerPerformance.profiles['darren-moore'].researchNotes=['<script>bad()</script>'];const escaped=renderManagerPerformance({...block,heading:'<img src=x>'},untrusted);assert(!escaped.includes('<script>'));assert(!escaped.includes('<img src=x>'));assert(escaped.includes('&lt;script&gt;'));
});
test('authenticated immediate preview accepts only a known selection and never client-supplied statistics',async()=>{
 const headers={Origin:'https://museum.example',Authorization:'Bearer unit_test_token_1234567890','Content-Type':'application/json'};
 const request=doc=>new Request('https://museum.example/editor-preview',{method:'POST',headers,body:JSON.stringify(doc)}),allow=async()=>Response.json({permissions:{push:true}});
 assert.deepEqual((await preparePreviewRequest(request({page}),allow,{},context.managerPerformance)).page,page);
 const unknown=structuredClone(page);unknown.blocks[1].manager='missing';assert.equal((await preparePreviewRequest(request({page:unknown}),allow,{},context.managerPerformance)).response.status,422);
 assert.equal((await preparePreviewRequest(request({page}),allow,{})).response.status,422);
 const forged=structuredClone(page);forged.blocks[1].summary={played:999};assert.equal((await preparePreviewRequest(request({page:forged}),allow,{},context.managerPerformance)).response.status,422);
 assert.equal((await preparePreviewRequest(request({page,managerPerformance:{}}),allow,{},context.managerPerformance)).response.status,400);
 const inColumn=structuredClone(page);inColumn.blocks=[inColumn.blocks[0],{type:'section',anchor:'results-section',navLabel:'',heading:'Results',background:'navy',spacing:'standard',columns:[{blocks:[block]}]}];assert((await preparePreviewRequest(request({page:inColumn}),allow,{},context.managerPerformance)).page);assert.match(renderPageContent(inColumn,context),/Caretaker/);
});
test('a changed archive score propagates to the website context without changing a block',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'albion-performance-source-'));
 try{
  for(const path of ['content/managers','content/manager-tenures','public/data'])await mkdir(join(directory,path),{recursive:true});
  const {register}=managerContent;
  for(const [folder,rows]of [['managers',register.managers],['manager-tenures',register.tenures]])for(const row of rows)await writeFile(join(directory,`content/${folder}/${row.id}.json`),JSON.stringify(row));
  const changed=structuredClone(records);const match=changed.matches.find(m=>m.date==='2018-04-07');assert.equal(match.hg,1);match.hg=2;
  await writeFile(join(directory,'public/data/results.json'),JSON.stringify(changed));
  const newer=await loadManagerContent(pathToFileURL(directory+'/')),before=performanceView(block,context).profile.summary,after=performanceView(block,{managerPerformance:newer.performance}).profile.summary;
  assert.equal(after.W,before.W+1);assert.equal(after.D,before.D-1);assert.equal(after.gf,before.gf+1);assert.notEqual(newer.performance.sourceSha256,managerContent.performance.sourceSha256);
 }finally{await rm(directory,{recursive:true,force:true});}
});
