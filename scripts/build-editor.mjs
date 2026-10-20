import {build} from 'vite';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const nativeWidgets=['string','text','number','boolean','select','list','object','relation','image'];
export const customWidgets=['layout-blocks','museum-image','answer-choice'];
export function checkWidgets(config){
 const seen=new Set();
 const walk=value=>{if(!value||typeof value!=='object')return;if(typeof value.widget==='string')seen.add(value.widget);for(const child of Object.values(value))if(Array.isArray(child))child.forEach(walk);else if(child&&typeof child==='object')walk(child);};walk(config);
 for(const widget of seen)if(![...nativeWidgets,...customWidgets].includes(widget))throw Error('The candidate editor does not register widget: '+widget);
 if(!seen.size)throw Error('The editor configuration contains no widgets.');
 return [...seen].sort();
}
export function checkModules(modules){
 if(!modules.length)throw Error('The editor module report is empty.');
 for(const id of modules)if(/(?:^|\/)(?:trim|platejs|@platejs|decap-cms-widget-(?:markdown|richtext)|decap-cms-backend-(?!github(?:\/|$))[^/]+)(?:\/|$)/.test(id))throw Error('Forbidden editor module: '+id);
}
export async function buildEditor(){
 const modules=new Set();
 await build({configFile:false,publicDir:false,base:'/admin/rebuild/',logLevel:'warn',define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{target:'es2022',outDir:'public/admin/rebuild',emptyOutDir:true,license:{fileName:'licenses.json'},lib:{entry:'src/editor/index.mjs',formats:['es'],fileName:()=> 'editor.js'},rolldownOptions:{output:{assetFileNames:'[name][extname]',chunkFileNames:'[name]-[hash].js'}}},plugins:[{name:'museum-editor-audit',generateBundle(_options,bundle){for(const output of Object.values(bundle)){if(output.type==='chunk')for(const id of Object.keys(output.modules))modules.add(id.replaceAll('\\','/').replace(process.cwd()+'/',''));}}}]});
 // Decap's published modules omit the monorepo MIT text from their tarballs.
 // Retained from upstream LICENSE, Git blob 0bbaf85db4053f11d6da573ed014acb1d0e0bd4a.
 const licensePath='public/admin/rebuild/licenses.json';
 const licenses=JSON.parse(await readFile(licensePath,'utf8'));
 const decapLicense=await readFile('src/editor/DECAP-LICENSE.txt','utf8');
 for(const license of licenses)if(license.name.startsWith('decap-cms-')&&!license.text)license.text=decapLicense;
 await writeFile(licensePath,JSON.stringify(licenses,null,2)+'\n');
 const files=[];
 for(const path of await readdir('public/admin/rebuild')){const bytes=await readFile('public/admin/rebuild/'+path);files.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
 checkModules([...modules]);
 if(files.some(file=>file.path.endsWith('.css')))throw Error('Candidate editor emits CSS: wire its stylesheet into rebuild.html before publishing.');
 checkWidgets(JSON.parse(await readFile('public/admin/config.yml','utf8')));
 await mkdir('.cloudflare',{recursive:true});await writeFile('.cloudflare/editor-build.json',JSON.stringify({modules:[...modules].sort(),files,nativeWidgets,customWidgets},null,2)+'\n');
 console.log(`PASS: source-built editor with ${modules.size} audited modules and ${files.length} emitted assets; legacy Markdown and Plate excluded.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await buildEditor();
