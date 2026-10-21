import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preparePreviewRequest,MAX_PREVIEW_BYTES} from '../src/lib/preview-request.mjs';
import {isComponentDraft,supportsAstroPage,validateComponentPage} from '../src/lib/component-preview.mjs';
import {createLivePreview} from '../src/lib/live-preview.mjs';
import {registerGitHubPreviewBackend} from '../public/admin/github-preview.mjs';
const origin='https://museum.example';const token='unit_test_token_1234567890';
const headers={Origin:origin,Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const fixture=async()=>JSON.parse(await readFile('test/fixtures/layout-initial.json','utf8'));
const req=(body,extra={})=>new Request(origin+'/editor-preview',{method:'POST',headers,body:JSON.stringify(body),...extra});
const allow=async()=>Response.json({permissions:{push:true}});

test('preview authentication fails closed before inspecting any draft',async()=>{
 let calls=0;const deny=()=>{calls++;throw Error('must not call');};
 for(const [request,status]of [[new Request(origin+'/editor-preview'),405],[req({}, {headers:{...headers,Origin:'https://elsewhere.example'}}),403],[req({}, {headers:{...headers,Authorization:''}}),401],[req({}, {headers:{...headers,'Content-Type':'text/plain'}}),415],[req({}, {headers:{...headers,'Content-Length':String(MAX_PREVIEW_BYTES+1)}}),413]]){
  const result=await preparePreviewRequest(request,deny);assert.equal(result.response.status,status);assert.equal(result.response.headers.get('cache-control'),'no-store');
 }
 assert.equal(calls,0);
});

test('preview accepts only confirmed GitHub push access and handles lookup misses',async()=>{
 const page=await fixture();
 for(const access of [{},{permissions:{}},{permissions:{push:false}}])assert.equal((await preparePreviewRequest(req({page}),async()=>Response.json(access))).response.status,403);
 for(const status of [401,403,404,429,500])assert.equal((await preparePreviewRequest(req({page}),async()=>new Response('',{status}))).response.status,status===401?401:503);
 assert.equal((await preparePreviewRequest(req({page}),async()=>{throw Error('offline');})).response.status,503);
 const result=await preparePreviewRequest(req({page}),async(url,options)=>{assert.equal(url,'https://api.github.com/repos/stevehill1981/albion-songs-trial');assert.equal(options.headers.Authorization,`Bearer ${token}`);assert.equal(options.redirect,'manual');return allow();});
 assert.deepEqual(result.page,page);
});

test('preview bounds actual streamed bytes, rejects invalid data, unsafe links and unsupported blocks',async()=>{
 const page=await fixture();
 const oversized=req({page:{...page,title:'x'.repeat(MAX_PREVIEW_BYTES)}});assert.equal((await preparePreviewRequest(oversized,allow)).response.status,413);
 for(const body of [[],{page,extra:true}])assert.equal((await preparePreviewRequest(req(body),allow)).response.status,400);
 for(const body of [{page:{...page,blocks:[]}}, {page:{...page,blocks:Array(21).fill(page.blocks[0])}}])assert.equal((await preparePreviewRequest(req(body),allow)).response.status,422);
 const unsafe=structuredClone(page);unsafe.blocks[1].columns[0].blocks[0].sources=[{label:'Bad',url:'javascript:alert(1)'}];assert.equal((await preparePreviewRequest(req({page:unsafe}),allow)).response.status,422);
 const unsupported=structuredClone(page);unsupported.blocks.push({type:'museum',anchor:'archive'});assert(!supportsAstroPage(unsupported));assert(!isComponentDraft(unsupported));assert.throws(()=>validateComponentPage(unsupported));
 const incomplete=structuredClone(page);delete incomplete.blocks[1].columns;assert(isComponentDraft(incomplete));assert(!supportsAstroPage(incomplete));assert.throws(()=>validateComponentPage(incomplete));
});

test('newer Astro previews win over older successful or failed network responses',async()=>{
 const jobs=[],pending=[],states=[];
 const preview=createLivePreview({schedule:job=>{jobs.push(job);return jobs.length;},cancel:()=>{},onState:state=>states.push(state),request:(page,signal)=>new Promise((resolve,reject)=>pending.push({page,signal,resolve,reject}))});
 preview.update({title:'older'});const older=jobs.shift()();preview.update({title:'newer'});const newer=jobs.shift()();
 assert(pending[0].signal.aborted);pending[1].resolve('<p>newer</p>');await newer;pending[0].resolve('<p>older</p>');await older;
 assert.deepEqual(states.filter(s=>s.status==='ready').map(s=>s.html),['<p>newer</p>']);
 preview.update({title:'offline'});const failure=jobs.shift()();pending[2].reject(Error('offline'));await failure;assert.equal(states.at(-1).status,'error');assert(!Object.hasOwn(states.at(-1),'html'));
 preview.dispose();preview.update({title:'closed'});assert.equal(jobs.length,0);
});

test('disposal cancels a pending Astro preview without updating an unmounted editor',async()=>{
 const jobs=[],states=[];let resolve;const preview=createLivePreview({schedule:job=>jobs.push(job),cancel:()=>{},onState:state=>states.push(state),request:()=>new Promise(done=>{resolve=done;})});
 preview.update({});const running=jobs.shift()();preview.dispose();resolve('late');await running;assert.equal(states.length,1);
});

test('preview backend extends native GitHub behaviour without reading credential storage',async()=>{
 const previous=globalThis.window;let Registered;const original={backend:{repo:'public/museum',auth_scope:'public_repo'}};
 try{
  class Native{constructor(config){this.config=config;}getToken(){return Promise.resolve(token);}}
  globalThis.window={CMS:{getBackend:name=>{assert.equal(name,'github');return{BackendClass:Native};},registerBackend:(name,klass)=>{assert.equal(name,'albion-github');Registered=klass;}}};
  const getToken=registerGitHubPreviewBackend();await assert.rejects(getToken(),/Sign in/);const backend=new Registered(original);assert.deepEqual(backend.config,original);assert.equal(await getToken(),token);
 }finally{globalThis.window=previous;}
});


test('a green static publication cannot conceal an absent or stale Astro runtime',async()=>{
 const {waitForPreviewRuntime}=await import('../scripts/served-revision.mjs');
 const options={attempts:1,sleep:async()=>{}};const revision='revision-under-test';
 const make=(status,hash=revision)=>new Response('',{status,headers:{'X-Albion-Renderer':'astro-components','X-Albion-Revision':hash,'Cache-Control':'no-store'}});
 await waitForPreviewRuntime(origin,revision,{...options,fetcher:async(_url,request)=>make(request.method==='POST'?401:405)});
 for(const fetcher of [async()=>new Response('static HTML'),async()=>make(401),async(_url,request)=>make(request.method==='POST'?401:405,'stale')])await assert.rejects(waitForPreviewRuntime(origin,revision,{...options,fetcher}),/missing, stale/);
});

test('one recursive page validation retains nested rejection and default-field behaviour',async()=>{
 const {validatePage}=await import('../src/lib/blocks.mjs');
 const page=await fixture();const missingDefaults=structuredClone(page);
 delete missingDefaults.blocks[1].columns[0].blocks[0].sources;
 assert.deepEqual(validateComponentPage(structuredClone(missingDefaults)),validatePage(structuredClone(missingDefaults)));
 const mutations=[
  child=>{child.sources=[{label:'Unsafe',url:'javascript:alert(1)'}];},
  child=>{child.paragraphs[0].parts[0].text='';},
  child=>{child.extra='not a supported field';},
  child=>{child.anchor='../outside';},
 ];
 for(const mutate of mutations){const invalid=structuredClone(page);mutate(invalid.blocks[1].columns[0].blocks[0]);assert.throws(()=>validatePage(structuredClone(invalid)));assert.throws(()=>validateComponentPage(structuredClone(invalid)));}
});
