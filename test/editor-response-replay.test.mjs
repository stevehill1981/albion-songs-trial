import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,harness,MAIN,HEAD,token} from '../scripts/test-support/editor-harness.mjs';
import {REPOSITORY} from '../auth/mcp/github.mjs';
import {editorOperation} from '../src/lib/editor-operations.mjs';
import {validateReplay,replayFetcher,responseDelivery} from '../scripts/test-support/editor-response-replay.mjs';
const text=JSON.stringify(fixture,null,2)+'\n';
const capture={schemaVersion:1,repository:REPOSITORY,revision:MAIN,bodies:{repository:{private:false,full_name:REPOSITORY,description:'x'.repeat(5000)},ref:{object:{sha:MAIN}},commit:{sha:MAIN},record:{encoding:'base64',size:Buffer.byteLength(text),content:Buffer.from(text).toString('base64')},collections:[],photographs:[{name:'team-1888.json',type:'file'}],managers:[{name:'darren-moore.json',type:'file'}],pullRequest:{number:59}}};
test('single and asynchronous chunked response models preserve every UTF-8 byte',async()=>{
 const bytes=new TextEncoder().encode('Albion’s history 🐦 '.repeat(150));
 for(const mode of ['single','chunked']){
  const chunks=[],response=responseDelivery(bytes,mode,n=>chunks.push(n));
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  assert.equal(chunks.reduce((a,b)=>a+b,0),bytes.length);
  if(mode==='chunked'){assert(chunks.length>1);assert(chunks.every(n=>n<=1024));}else assert.equal(chunks.length,1);
 }
});
test('full public response models preserve content and fresh permission rejection',async()=>{
 for(const denied of [false,true]){
  const base=harness({denied}),adapter=replayFetcher(base.fetcher,capture,'single');
  const request=new Request('https://museum.example/editor-api',{method:'POST',headers:{Origin:'https://museum.example','Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'read'})});
  const response=await editorOperation(request,adapter.fetcher);
  assert.equal(response.status,denied?403:200);
  if(!denied){assert.deepEqual((await response.json()).document,fixture);assert.equal(base.calls.length,3);}else assert.equal(base.calls.length,1);
 }
 const base=harness(),adapter=replayFetcher(base.fetcher,capture,'single');
 const request=new Request('https://museum.example/editor-api',{method:'POST',headers:{Origin:'https://museum.example','Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'save',document:base.page,baseRevision:MAIN})});
 const response=await editorOperation(request,adapter.fetcher);assert.equal(response.status,200);assert.equal((await response.json()).commit,HEAD);assert.equal(base.calls.length,9);
});
test('missing, private or changed replay content is rejected without a live fallback',()=>{
 for(const change of [c=>delete c.bodies.managers,c=>c.bodies.repository.private=true,c=>c.bodies.record.content=Buffer.from('{}').toString('base64'),c=>c.bodies.record.size++,c=>c.bodies.ref.object.sha=HEAD]){
  const invalid=structuredClone(capture);change(invalid);assert.throws(()=>validateReplay(invalid));
 }
});
test('modelled file-write responses follow GitHub metadata-only content shape',async()=>{
 const base=harness(),adapter=replayFetcher(base.fetcher,capture,'single');
 const response=await adapter.fetcher(`https://api.github.com/repos/${REPOSITORY}/contents/content/pages/component-preview-trial.json`,{method:'PUT',headers:{Authorization:`Bearer ${token}`},redirect:'manual',signal:AbortSignal.timeout(1000),body:JSON.stringify({content:Buffer.from(text).toString('base64')})});
 const result=await response.json();assert(!Object.hasOwn(result.content,'content'));assert(!Object.hasOwn(result.content,'encoding'));assert.equal(result.content.size,Buffer.byteLength(text));assert.equal(result.commit.sha,HEAD);
});
