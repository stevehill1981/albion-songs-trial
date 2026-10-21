import test from 'node:test';
import assert from 'node:assert/strict';
import {editorOperation,EDITOR_PAGE} from '../src/lib/editor-operations.mjs';
import {harness,fixture,MAIN,HEAD,MERGED,token} from '../scripts/test-support/editor-harness.mjs';
test('editor endpoint rejects origin, missing credentials, unknown fields, scope and streamed oversized bodies before upstream access',async()=>{
 const h=harness();
 for(const [data,headers,status]of [[{action:'read'},{Origin:'https://evil.example'},403],[{action:'read'},{Authorization:''},401],[{action:'read',id:'songs'},{},400],[{action:'constructor'},{},400],[{action:'save',document:{...h.page,slug:'songs'},baseRevision:MAIN},{},422],[{action:'publish',draftNumber:17,baseRevision:MAIN,expectedCommit:HEAD,confirmation:'yes'},{},400]])assert.equal((await h.call(data,headers)).status,status);
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('x'.repeat(70*1024)));controller.close();}});
 const response=await editorOperation(new Request('https://museum.example/editor-api',{method:'POST',headers:{Origin:'https://museum.example','Content-Type':'application/json',Authorization:`Bearer ${token}`},body:stream,duplex:'half'}),()=>assert.fail('Oversized body must not reach GitHub'));
 assert.equal(response.status,400);assert.equal(h.calls.length,0);
});
test('missing permission fails closed; foreign drafts and stale main never write',async()=>{
 for(const options of [{denied:true},{missing:true},{foreign:true},{stale:true}]){
  const h=harness(options);const response=await h.call({action:'save',document:h.page,baseRevision:MAIN,...(options.foreign?{draftNumber:17,expectedCommit:HEAD}:{})});assert(response.status>=400);assert(!h.calls.some(c=>c.method!=='GET'));
 }
});
test('real shared client reads only the practice page, filters draft list and saves exact sources unchanged',async()=>{
 const h=harness();const read=await (await h.call({action:'read'})).json();assert.deepEqual(read.document,fixture);
 const list=await (await h.call({action:'drafts'})).json();assert.deepEqual(list.drafts.map(d=>d.number),[17]);
 const result=await (await h.call({action:'save',document:h.page,baseRevision:MAIN})).json();assert.equal(result.commit,HEAD);
 const write=h.calls.find(c=>c.method==='PUT');assert.equal(write.path,`/contents/content/pages/${EDITOR_PAGE}.json`);assert.deepEqual(JSON.parse(Buffer.from(write.body.content,'base64')),h.page);
});
test('uncertain writes are explicit, sanitized and never repeated automatically',async()=>{
 const h=harness({lost:true});const response=await h.call({action:'save',document:h.page,baseRevision:MAIN});const text=await response.text();assert.equal(response.status,503);assert.equal(JSON.parse(text).error.uncertain,true);assert(!text.includes(token));assert.equal(h.calls.filter(c=>c.method!=='GET').length,1);
});
test('publication keeps exact preview guards and confirms the actually served revision',async()=>{
 const args={action:'publish',draftNumber:17,baseRevision:MAIN,expectedCommit:HEAD,confirmation:'Publish this previewed revision'};
 const bad=harness({unchecked:true});assert.equal((await bad.call(args)).status,409);assert(!bad.calls.some(c=>c.path.endsWith('/merge')));
 const h=harness();assert.equal((await (await h.call(args)).json()).state,'publishing');assert.equal((await (await h.call({action:'publication',revision:MERGED})).json()).state,'publishing');
 const live=harness({live:true});assert.equal((await (await live.call({action:'publication',revision:MERGED})).json()).state,'live');
});
