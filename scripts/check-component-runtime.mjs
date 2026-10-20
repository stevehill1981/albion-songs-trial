// Exercise the adapter's actual compiled modules in its installed workerd
// simulator. Only the fixed GitHub access lookup is mocked; no auth bypass or
// test credential is added to the deployed Worker.
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {renderPageContent} from '../src/lib/blocks.mjs';
const directory=resolve('.cloudflare/output/v0/workers/default');
const config=JSON.parse(await readFile(join(directory,'worker.config.json'),'utf8'));
const context=JSON.parse(await readFile('src/generated/component-context.json','utf8'));
const page=JSON.parse(await readFile('content/pages/component-preview-trial.json','utf8'));
const fixture=JSON.parse(await readFile('test/fixtures/layout-initial.json','utf8'));
const temp=await mkdtemp(join(tmpdir(),'albion-astro-runtime-'));
const token='unit_test_token_for_runtime_only';const origin='https://museum.example';
let allowed=true,lookups=0;const seen=[];let runtime;
try{
runtime=new Miniflare(convertV4MiniflareOptions({
 modulesRoot:join(directory,'bundle'),
 modules:[config.manifest.mainModule,...Object.keys(config.manifest.modules).filter(name=>name!==config.manifest.mainModule)].map(path=>({type:'ESModule',path:join(directory,'bundle',path)})),
 compatibilityDate:config.compatibilityDate,
 // Static routing is checked through Astro's preview server and hosted URLs.
 // This isolated test invokes only the compiled dynamic route.
 serviceBindings:{ASSETS:()=>new Response('Not a static asset.',{status:404})},
 defaultPersistRoot:temp,
 outboundService:async request=>{
  seen.push({url:request.url,authorised:request.headers.get('Authorization')===`Bearer ${token}`});
  assert.equal(request.url,'https://api.github.com/repos/stevehill1981/albion-songs-trial');assert.equal(request.headers.get('Authorization'),`Bearer ${token}`);lookups++;
  return Response.json({permissions:{push:allowed}});
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
 console.log(`PASS: compiled Astro/workerd renders ${variants.length+1} draft variants with matching markup; authentication, missing images, colours, columns and escaping checked.`);
}finally{await runtime?.dispose();await rm(temp,{recursive:true,force:true});}
