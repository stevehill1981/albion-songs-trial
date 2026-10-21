import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {editorOperation,EDITOR_PAGE} from '../src/lib/editor-operations.mjs';
import {REPOSITORY} from '../auth/mcp/github.mjs';
const fixture=JSON.parse(await readFile(new URL('../content/pages/component-preview-trial.json',import.meta.url),'utf8'));
const MAIN='a'.repeat(40),HEAD='b'.repeat(40),MERGED='c'.repeat(40),token='test_editor_credential_never_saved';
function harness(options={}){
 const calls=[];const page=structuredClone(fixture);page.blocks[0].heading='A saved inline heading';
 const fetcher=async(url,init={})=>{
  const path=new URL(url).pathname.replace(`/repos/${REPOSITORY}`,'');const method=init.method||'GET';calls.push({url,path,method,body:init.body&&JSON.parse(init.body)});
  assert(init.signal);assert.equal(init.redirect,'manual');
  if(url.startsWith('https://api.github.com/')){
   assert.equal(init.headers.Authorization,`Bearer ${token}`);
   if(method!=='GET'&&options.lost)throw Error(token);
   if(path==='')return Response.json({permissions:options.missing?{}:{push:!options.denied}});
   if(path==='/git/ref/heads/main')return Response.json({object:{sha:options.stale?HEAD:MAIN}});
   if(path==='/contents/content/pages/'+EDITOR_PAGE+'.json')return method==='PUT'?Response.json({commit:{sha:HEAD}}):Response.json({encoding:'base64',size:5000,sha:MAIN,content:Buffer.from(JSON.stringify(fixture)).toString('base64')});
   if(path==='/contents/content/collections')return Response.json([]);
   if(path==='/contents/content/photographs')return Response.json([{type:'file',name:'team-1888.json'}]);
   if(path==='/contents/content/managers')return Response.json([{type:'file',name:'darren-moore.json'}]);
   if(path==='/git/refs')return Response.json({});
   if(path==='/pulls')return Response.json(method==='POST'?{number:17,html_url:'https://github.com/'+REPOSITORY+'/pull/17'}:[{number:17,title:'Practice page',head:{ref:`cms/mcp/pages/${EDITOR_PAGE}/1234abcd`,sha:HEAD}},{number:18,title:'Other',head:{ref:'cms/mcp/pages/songs/1234abcd',sha:HEAD}}]);
   if(path==='/pulls/17')return Response.json({state:'open',changed_files:1,head:{sha:HEAD,ref:`cms/mcp/pages/${options.foreign?'songs':EDITOR_PAGE}/1234abcd`,repo:{full_name:REPOSITORY}},base:{ref:'main'}});
   if(path==='/pulls/17/files')return Response.json([{filename:`content/pages/${options.foreign?'songs':EDITOR_PAGE}.json`,status:'modified'}]);
   if(path==='/pulls/17/commits')return Response.json([{parents:[{sha:MAIN}]}]);
   if(path===`/commits/${HEAD}/status`)return Response.json({statuses:options.unchecked?[]:[{context:'albion/deploy-preview',state:'success',target_url:'https://1234abcd-throstle-and-stripes.steve-e85.workers.dev/'}]});
   if(path===`/commits/${HEAD}/check-runs`)return Response.json({check_runs:[{name:'Validate Songs page',status:'completed',conclusion:'success'}]});
   if(path==='/pulls/17/merge')return Response.json({merged:true,sha:MERGED});
   if(path===`/commits/${MERGED}/status`)return Response.json({statuses:[{context:'albion/production',state:'success'}]});
   throw Error('Unexpected fixed request '+path);
  }
  assert.equal(init.headers?.Authorization,undefined);
  return url.endsWith('/version.json')?Response.json({revision:url.includes('1234abcd-')?HEAD:options.live?MERGED:MAIN}):new Response(`<meta name="trial-revision" content="${HEAD}">`);
 };
 const call=async(data,extra={})=>editorOperation(new Request('https://museum.example/editor-api',{method:'POST',headers:{Origin:'https://museum.example','Content-Type':'application/json',Authorization:`Bearer ${token}`,...extra},body:JSON.stringify(data)}),fetcher);
 return{call,calls,page};
}
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
