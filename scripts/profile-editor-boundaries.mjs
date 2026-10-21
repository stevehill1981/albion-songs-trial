// Local fixtures only. This script adds no deployed route or authentication bypass.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {harness,MAIN,HEAD,fixture,token} from './test-support/editor-harness.mjs';
import {summarizeProfile} from './test-support/editor-profile.mjs';
import {assertNoLegacyTemplates} from './check-runtime-templates.mjs';

const [outputArg,workload,condition,runArg]=process.argv.slice(2);
assert(outputArg&&['read','save'].includes(workload)&&['fresh','preloaded'].includes(condition)&&/^[1-3]$/.test(runArg||''),'Use OUTPUT_DIRECTORY read|save fresh|preloaded 1|2|3');
const output=resolve(outputArg),directory=resolve('.cloudflare/output/v0/workers/default');
const config=JSON.parse(await readFile(join(directory,'worker.config.json'),'utf8'));
const context=JSON.parse(await readFile('src/generated/component-context.json','utf8'));
const names=[config.manifest.mainModule,...Object.keys(config.manifest.modules).filter(name=>name!==config.manifest.mainModule)];
const sources=await Promise.all(names.map(async name=>({name,source:await readFile(join(directory,'bundle',name),'utf8')})));
assertNoLegacyTemplates(sources,JSON.parse(await readFile('src/lib/museum-patterns.json','utf8')));
const digest=createHash('sha256').update(JSON.stringify(sources)).digest('hex');
const label=`${workload}-${condition}-${runArg}`,origin='https://museum.example';
await mkdir(output,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),'albion-editor-boundaries-'));
const evidence={label,revision:context.revision,bundleDigest:digest,phases:[],calls:[],temporaryDirectory:temp,limitations:'Local fixture CPU samples, not hosted milliseconds or remote GitHub latency. Inspector attachment precedes the first route request, but follows isolate creation and eager entry bootstrap. Pre-upstream includes route startup/validation/first request; post-upstream includes response handling, further requests and framework completion.'};
let runtime,inspector,currentHarness,command,boundaryError,split=false,phase='';
const pending=new Map();
const terminate=async()=>{inspector?.close();await runtime?.dispose();await rm(temp,{recursive:true,force:true});process.exit(1);};
process.once('SIGTERM',terminate);process.once('SIGINT',terminate);
async function start(name){phase=name;await command('Profiler.start');}
async function stop(){
 const {profile}=await command('Profiler.stop'),raw=JSON.stringify(profile);
 assert(Buffer.byteLength(raw)<=2*1024*1024,'Capture exceeded its bound');
 const file=`${label}-${phase}.cpuprofile`;await writeFile(join(output,file),raw);
 const summary=summarizeProfile(profile);
 evidence.phases.push({phase,file,...summary});
}
try{
 runtime=new Miniflare(convertV4MiniflareOptions({
  inspectorPort:0,modulesRoot:join(directory,'bundle'),modules:names.map(name=>({type:'ESModule',path:join(directory,'bundle',name)})),
  compatibilityDate:config.compatibilityDate,compatibilityFlags:config.compatibilityFlags,defaultPersistRoot:temp,
  serviceBindings:{ASSETS:()=>new Response('Not a static asset.',{status:404})},
  outboundService:async request=>{
   assert(currentHarness,'Unsigned control must make zero upstream requests');
   assert.equal(new URL(request.url).hostname,'api.github.com','Only the fixed fixture API is allowed');
   if(split){split=false;const after=phase.replace('pre-upstream','post-upstream');try{await stop();await start(after);}catch(error){boundaryError=error;throw error;}}
   return currentHarness.fetcher(request.url,{method:request.method,headers:{Authorization:request.headers.get('Authorization')},redirect:'manual',signal:request.signal,...(request.method==='GET'?{}:{body:await request.text()})});
  }
 }));
 const endpoint=await runtime.getInspectorURL();endpoint.protocol='http:';endpoint.pathname='/json';
 const targets=await fetch(endpoint,{signal:AbortSignal.timeout(10000)}).then(r=>r.json());assert(targets.length>0);
 inspector=new WebSocket(targets[0].webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Inspector connection timed out')),10000);inspector.onopen=()=>{clearTimeout(timer);resolve();};inspector.onerror=()=>{clearTimeout(timer);reject(Error('Inspector connection failed'));};});
 let sequence=0;
 inspector.onmessage=event=>{const reply=JSON.parse(event.data),wait=pending.get(reply.id);if(wait){pending.delete(reply.id);clearTimeout(wait.timer);reply.error?wait.reject(Error(JSON.stringify(reply.error))):wait.resolve(reply.result);}};
 command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Inspector command timed out: '+method));},10000);pending.set(id,{resolve,reject,timer});inspector.send(JSON.stringify({id,method,params}));});
 await command('Profiler.enable');await command('Profiler.setSamplingInterval',{interval:100});
 const dispatch=(body,authorized=true)=>runtime.dispatchFetch(origin+'/editor-api',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(authorized?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 if(condition==='preloaded'){
  await start('unsigned-startup');const response=await dispatch({action:workload},false);assert.equal(response.status,401);await response.text();await stop();assert.equal(currentHarness,undefined);
 }
 for(const attempt of ['first','repeat']){
  currentHarness=harness();split=true;await start(`${attempt}-pre-upstream`);
  const body=workload==='read'?{action:'read'}:{action:'save',document:currentHarness.page,baseRevision:MAIN};
  const response=await dispatch(body);if(boundaryError)throw boundaryError;assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('Cache-Control'),'no-store');
  const result=await response.json();assert.equal(split,false,'Operation must reach the fixed GitHub fixture');
  if(workload==='read')assert.deepEqual(result.document,fixture);else assert.equal(result.commit,HEAD);
  await stop();
  const calls=currentHarness.calls.map(({method,path})=>({method,path}));
  assert.deepEqual(calls.slice(0,2),[{method:'GET',path:''},{method:'GET',path:'/git/ref/heads/main'}],'Each operation must check fresh permission and revision');
  const expected=workload==='read'?['','/git/ref/heads/main','/contents/content/pages/component-preview-trial.json']:['','/git/ref/heads/main','/contents/content/collections','/contents/content/photographs','/contents/content/managers','/contents/content/pages/component-preview-trial.json','/git/refs','/contents/content/pages/component-preview-trial.json','/pulls'];
  assert.deepEqual(calls.map(c=>c.path),expected,'Missing or unexpected fixture work');
  evidence.calls.push({attempt,calls});currentHarness=undefined;
 }
}finally{
 for(const wait of pending.values()){clearTimeout(wait.timer);wait.reject(Error('Inspector closed'));}pending.clear();
 inspector?.close();await runtime?.dispose();await rm(temp,{recursive:true,force:true});
 process.removeListener('SIGTERM',terminate);process.removeListener('SIGINT',terminate);
}
await writeFile(join(output,`${label}.json`),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({label,revision:evidence.revision,phases:evidence.phases.map(({phase,activeSamples,groups})=>({phase,activeSamples,groups})),disposed:true}));
