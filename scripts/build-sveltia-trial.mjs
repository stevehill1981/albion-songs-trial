import {build} from 'vite';
import {mkdir,readFile,writeFile,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadTrialPages} from '../src/lib/sveltia-trial.mjs';
export async function buildSveltiaTrial(){
 const root='public/admin/sveltia';
 await build({configFile:false,publicDir:false,base:'/admin/sveltia/',logLevel:'warn',build:{target:'es2022',outDir:root,emptyOutDir:true,license:{fileName:'licenses.json'},lib:{entry:'src/editor/sveltia-trial.mjs',formats:['es'],fileName:()=> 'trial.js'},rolldownOptions:{output:{chunkFileNames:'[name]-[hash].js',assetFileNames:'[name]-[hash][extname]'}}}});
 const original=JSON.parse(await readFile('public/admin/config.yml','utf8'));
 const pages=await loadTrialPages();
 const pageCollection=structuredClone(original.collections.find(c=>c.name==='pages'));
 pageCollection.name='trial-pages';pageCollection.label='Managers · trial page tree';pageCollection.folder='content/sveltia-trial';pageCollection.preview_path='sveltia-trial/{{slug}}';pageCollection.nested={depth:5,summary:'{{title}}',subfolders:true};pageCollection.meta={path:{index_file:'index'}};
 const blockField=pageCollection.fields.find(f=>f.name==='blocks');blockField.widget='list';blockField.types=blockField.types.filter(t=>['intro','text-panel','manager-performance','section','photograph'].includes(t.name));
 const filterChildren=value=>{if(!value||typeof value!=='object')return;if(value.name==='blocks'&&Array.isArray(value.types))value.types=value.types.filter(t=>['intro','text-panel','manager-performance','section','photograph'].includes(t.name));for(const child of Object.values(value))if(Array.isArray(child))child.forEach(filterChildren);else if(child&&typeof child==='object')filterChildren(child);};filterChildren(blockField);
 const collections=[pageCollection,...original.collections.filter(c=>['museum-collections','photographs'].includes(c.name)).map(c=>({...c,create:false,delete:false}))];
 const nativeImages=value=>{if(!value||typeof value!=='object')return;if(value.widget==='museum-image')value.widget='image';for(const child of Object.values(value))if(Array.isArray(child))child.forEach(nativeImages);else if(child&&typeof child==='object')nativeImages(child);};nativeImages(collections);
 const site=JSON.parse(await readFile('site.json','utf8'));
 const config={backend:{name:'test-repo'},site_url:site.origin+'/sveltia-trial/managers',display_url:site.origin+'/sveltia-trial/managers',publish_mode:'simple',media_folder:'public/uploads',public_folder:'/uploads',collections};
 await writeFile(root+'/config.json',JSON.stringify(config,null,2)+'\n');
 await cp('public/admin/preview-context.json',root+'/context.json');
 const files=pages.map(p=>p.file);
 for(const directory of ['content/photographs','content/collections'])for(const name of await readdir(directory))if(name.endsWith('.json'))files.push(directory+'/'+name);
 await mkdir(root+'/seed',{recursive:true});
 for(const file of files){const target=root+'/seed/'+file;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await cp(file,target);}
 await writeFile(root+'/seed/manifest.json',JSON.stringify({files},null,2)+'\n');
 const css=(await readdir(root)).filter(name=>name.endsWith('.css')).map(name=>`<link rel="stylesheet" href="/admin/sveltia/${name}">`).join('');
 await writeFile(root+'/editor.html',`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sveltia trial editor</title><link rel="cms-config-url" type="text/yaml" href="/admin/sveltia/config.json"><link rel="cms-seed-url" href="/admin/sveltia/seed/manifest.json">${css}</head><body><script type="module" src="/admin/sveltia/trial.js"></script></body></html>`);
 const assets=[];const collect=async(relative='')=>{for(const entry of await readdir(root+(relative?'/'+relative:''),{withFileTypes:true})){const path=relative?relative+'/'+entry.name:entry.name;if(entry.isDirectory())await collect(path);else{const bytes=await readFile(root+'/'+path);if(bytes.length>25*1024*1024)throw Error('Trial asset exceeds free hosting file limit: '+path);assets.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}};await collect();
 await writeFile('.cloudflare/sveltia-build.json',JSON.stringify({version:'0.249.0',assets},null,2)+'\n');console.log(`PASS: isolated Sveltia trial with ${pages.length} nested pages and ${assets.length} checked assets; no GitHub backend.`);
}
