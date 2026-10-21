// Exercise the adapter's actual compiled modules in its installed workerd
// simulator. Only the fixed GitHub access lookup is mocked; no auth bypass or
// test credential is added to the deployed Worker.
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {renderPageContent} from '../src/lib/blocks.mjs';
import {harness,MAIN,HEAD,MERGED} from './test-support/editor-harness.mjs';
import {createDraft} from '../src/editor/visual/state.mjs';
const directory=resolve('.cloudflare/output/v0/workers/default');
const config=JSON.parse(await readFile(join(directory,'worker.config.json'),'utf8'));
assert(config.compatibilityFlags.includes('global_fetch_strictly_public'),'Public saved-preview checks require the same public-fetch setting as the auth Worker.');
const context=JSON.parse(await readFile('src/generated/component-context.json','utf8'));
const page=JSON.parse(await readFile('content/pages/component-preview-trial.json','utf8'));
const fixture=JSON.parse(await readFile('test/fixtures/layout-initial.json','utf8'));
const profilePath=process.env.ALBION_EDITOR_CPU_PROFILE;
const profileWorkload=process.env.ALBION_EDITOR_CPU_WORKLOAD||'preview';
const profileRounds=Number(process.env.ALBION_EDITOR_CPU_ROUNDS||60);
if(profilePath){assert(['preview','read','status'].includes(profileWorkload));assert(Number.isSafeInteger(profileRounds)&&profileRounds>=1&&profileRounds<=100);}
const temp=await mkdtemp(join(tmpdir(),'albion-astro-runtime-'));
const token='unit_test_token_for_runtime_only';const origin='https://museum.example';
let editorHarness=null;let allowed=true,lookups=0;const seen=[];let runtime,inspector;
try{
runtime=new Miniflare(convertV4MiniflareOptions({
 ...(profilePath?{inspectorPort:0}:{}),
 modulesRoot:join(directory,'bundle'),
 modules:[config.manifest.mainModule,...Object.keys(config.manifest.modules).filter(name=>name!==config.manifest.mainModule)].map(path=>({type:'ESModule',path:join(directory,'bundle',path)})),
 compatibilityDate:config.compatibilityDate,
 compatibilityFlags:config.compatibilityFlags,
 // Static routing is checked through Astro's preview server and hosted URLs.
 // This isolated test invokes only the compiled dynamic route.
 serviceBindings:{ASSETS:()=>new Response('Not a static asset.',{status:404})},
 defaultPersistRoot:temp,
 outboundService:async request=>{
  if(editorHarness)return editorHarness.fetcher(request.url,{method:request.method,headers:request.headers.has('Authorization')?{Authorization:request.headers.get('Authorization')}:{},redirect:'manual',signal:request.signal,...(request.method==='GET'?{}:{body:await request.text()})});
  seen.push({url:request.url,authorised:request.headers.get('Authorization')===`Bearer ${token}`});
  assert.equal(request.headers.get('Authorization'),`Bearer ${token}`);lookups++;
  const root='https://api.github.com/repos/stevehill1981/albion-songs-trial';
  if(request.url===root)return Response.json({permissions:{push:allowed}});
  if(request.url===root+'/git/ref/heads/main')return Response.json({object:{sha:'a'.repeat(40)}});
  if(request.url===root+'/contents/content/pages/component-preview-trial.json?ref='+'a'.repeat(40))return Response.json({encoding:'base64',size:JSON.stringify(page).length,sha:'b'.repeat(40),content:Buffer.from(JSON.stringify(page)).toString('base64')});
  assert.fail('Unexpected compiled route request: '+request.url);
 }
}));
const send=draft=>runtime.dispatchFetch(origin+'/editor-preview',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({page:draft})});
const norm=html=>html.replace(/\s+/g,' ').trim();
 const get=await runtime.dispatchFetch(origin+'/editor-preview');assert.equal(get.status,405,await get.clone().text());assert.equal(get.headers.get('X-Albion-Revision'),context.revision);
 const unauthorised=await runtime.dispatchFetch(origin+'/editor-preview',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(unauthorised.status,401);assert.equal(lookups,0);
 const variants=[page,fixture];
 for(const columns of [1,2,3])for(const background of ['white','navy','pale-blue']){
  const p=structuredClone(page);const section=p.blocks[1];section.background=background;section.columns=Array.from({length:columns},(_,i)=>({blocks:[{type:'text-panel',anchor:`column-${i}`,navLabel:'',heading:`Column ${i+1}`,paragraphs:[{parts:[{type:'text',text:'A real Astro component.'}]}],sources:[]}]}));variants.push(p);
 }
 for(const id of ['darren-moore','steve-clarke','tony-mowbray'])variants.push(JSON.parse(await readFile(`content/pages/manager-${id}.json`,'utf8')));
 const switched=structuredClone(variants.at(-1));switched.blocks[1].manager='darren-moore';variants.push(switched);
 const visual=createDraft(JSON.parse(await readFile('content/pages/manager-darren-moore.json','utf8')));
 visual.set('blocks.0','heading','Practice <heading>');visual.commit();
 visual.set('blocks.2','paragraphs.0.parts.0.text','An unsaved practice paragraph.');visual.commit();
 variants.push(visual.page);visual.undo();variants.push(visual.page);
 const column=structuredClone(page);column.blocks[1].background='navy';column.blocks[1].columns=[{blocks:[{type:'manager-performance',anchor:'performance',navLabel:'',heading:'Recorded results',manager:'darren-moore'}]}];variants.push(column);
 const button=structuredClone(page);button.blocks[0].buttonLabel='Explore';variants.push(button);
 for(const draft of variants){
  const response=await send(draft);assert.equal(response.status,200,(await response.clone().text())+' '+JSON.stringify(seen));assert.equal(response.headers.get('X-Albion-Renderer'),'astro-components');assert.equal(response.headers.get('Cache-Control'),'no-store');
  const html=await response.text();assert.equal(norm(html),norm(renderPageContent(draft,context)),'Astro preview differs from the published component contract');assert(!html.includes('href="#undefined"'));
 }
 const unsafe=structuredClone(page);unsafe.blocks[0].heading='<script>alert(1)</script>';const escaped=await send(unsafe);assert.equal(escaped.status,200);const html=await escaped.text();assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
 const missing=structuredClone(page);missing.blocks[1].columns[1].blocks[0].photograph='not-published';assert.equal((await send(missing)).status,422);
 const unknown=structuredClone(switched);unknown.blocks[1].manager='missing';assert.equal((await send(unknown)).status,422);
 const forged=structuredClone(switched);forged.blocks[1].summary={played:999};assert.equal((await send(forged)).status,422);
 allowed=false;assert.equal((await send(page)).status,403);
 allowed=true;
 const operation=(body,headers={})=>runtime.dispatchFetch(origin+'/editor-api',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:`Bearer ${token}`,...headers},body:JSON.stringify(body)});
 assert.equal((await runtime.dispatchFetch(origin+'/editor-api')).status,405);
 assert.equal((await operation({action:'read'},{Authorization:''})).status,401);
 assert.equal((await operation({action:'read'},{Origin:'https://hostile.example'})).status,403);
 assert.equal((await operation({action:'read',id:'songs'})).status,400);
 const read=await operation({action:'read'});assert.equal(read.status,200,await read.clone().text());assert.equal(read.headers.get('Cache-Control'),'no-store');assert.deepEqual((await read.json()).document,page);
 allowed=false;assert.equal((await operation({action:'read'})).status,403);
 editorHarness=harness();
 const saved=await operation({action:'save',document:editorHarness.page,baseRevision:MAIN});assert.equal(saved.status,200,await saved.clone().text());assert.equal((await saved.json()).commit,HEAD);
 const checked=await operation({action:'status',draftNumber:17});assert.equal(checked.status,200,await checked.clone().text());const checkedValue=await checked.json();assert.equal(checkedValue.canPublish,true,JSON.stringify({checkedValue,calls:editorHarness.calls.map(c=>c.url)}));
 const published=await operation({action:'publish',draftNumber:17,baseRevision:MAIN,expectedCommit:HEAD,confirmation:'Publish this previewed revision'});assert.equal(published.status,200,await published.clone().text());assert.equal((await published.json()).state,'publishing');
 const queued=await operation({action:'publication',revision:MERGED});assert.equal((await queued.json()).state,'publishing');
 editorHarness=harness({live:true});const live=await operation({action:'publication',revision:MERGED});assert.equal((await live.json()).state,'live');
 editorHarness=harness({unchecked:true});const refused=await operation({action:'publish',draftNumber:17,baseRevision:MAIN,expectedCommit:HEAD,confirmation:'Publish this previewed revision'});assert.equal(refused.status,409);assert(!editorHarness.calls.some(c=>c.path.endsWith('/merge')));
 if(profilePath){
  const endpoint=await runtime.getInspectorURL();endpoint.protocol='http:';endpoint.pathname='/json';
  const targets=await fetch(endpoint).then(r=>r.json());assert(targets.length>0,'The runtime inspector target is missing.');
  inspector=new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{inspector.onopen=resolve;inspector.onerror=reject;});
  let sequence=0;const pending=new Map();
  inspector.onmessage=event=>{const reply=JSON.parse(event.data),wait=pending.get(reply.id);if(wait){pending.delete(reply.id);clearTimeout(wait.timer);reply.error?wait.reject(Error(JSON.stringify(reply.error))):wait.resolve(reply.result);}};
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Inspector command timed out: '+method));},10000);pending.set(id,{resolve,reject,timer});inspector.send(JSON.stringify({id,method,params}));});
  try{
   await command('Profiler.enable');await command('Profiler.setSamplingInterval',{interval:100});await command('Profiler.start');
   editorHarness=profileWorkload==='preview'?null:harness();allowed=true;
   for(let i=0;i<profileRounds;i++){
    const response=profileWorkload==='preview'?await send(page):await operation(profileWorkload==='read'?{action:'read'}:{action:'status',draftNumber:17});
    assert.equal(response.status,200,await response.clone().text());await response.text();
   }
   const {profile}=await command('Profiler.stop');assert(profile.samples.length>0);await writeFile(profilePath,JSON.stringify(profile));
   console.log(`Captured local workerd CPU profile: ${profileRounds} ${profileWorkload} operations; not hosted CPU compliance.`);
  }finally{for(const wait of pending.values()){clearTimeout(wait.timer);wait.reject(Error('Inspector closed.'));}pending.clear();inspector.close();}
 }
 console.log('PASS: compiled saving, checked preview and exact-revision publishing retain source content; unverified previews cannot merge and queued publication stays distinct from actually live.');
 console.log('PASS: compiled editor endpoint loads the exact practice page and rejects hostile origin, missing permission, missing sign-in and arbitrary record selection.');
 console.log(`PASS: compiled Astro/workerd renders ${variants.length+1} draft variants with matching markup; authentication, missing images, colours, columns and escaping checked.`);
}finally{inspector?.close();await runtime?.dispose();await rm(temp,{recursive:true,force:true});}
