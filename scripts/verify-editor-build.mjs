import {readFile,readdir,mkdtemp,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkModules,checkWidgets,nativeWidgets} from './build-editor.mjs';
export async function verifyEditorBuild({root='build',reportFile='.cloudflare/editor-build.json'}={}){
 const report=JSON.parse(await readFile(reportFile,'utf8'));
 checkModules(report.modules);
 const config=JSON.parse(await readFile(root+'/admin/config.yml','utf8'));checkWidgets(config);
 for(const name of ['decap-cms-core','decap-cms-backend-github','decap-cms-locales',...nativeWidgets.map(n=>'decap-cms-widget-'+n)])if(!report.modules.some(id=>id.startsWith('node_modules/'+name+'/')))throw Error('Missing editor package: '+name);
 const actual=(await readdir(root+'/admin/rebuild')).sort();
 if(JSON.stringify(actual)!==JSON.stringify(report.files.map(f=>f.path).sort()))throw Error('Emitted editor asset inventory differs.');
 if(!actual.includes('editor.js')||!actual.includes('licenses.json'))throw Error('Editor entry or licence inventory missing.');
 let wasmCount=0;
 for(const file of report.files){
  if(!/^[a-zA-Z0-9_.-]+$/.test(file.path))throw Error('Unsafe editor asset path.');
  const data=await readFile(root+'/admin/rebuild/'+file.path);
  if(data.length!==file.bytes||createHash('sha256').update(data).digest('hex')!==file.sha256)throw Error('Editor asset digest mismatch: '+file.path);
  if(file.path.endsWith('.js')){
   const text=data.toString();
   for(const match of text.matchAll(/(?:from\s*|import\()\s*["']\.\/([^"']+)["']/g))if(!actual.includes(match[1]))throw Error('Missing lazy editor chunk: '+match[1]);
   for(const match of text.matchAll(/data:application\/wasm;base64,([A-Za-z0-9+/=]+)/g)){if(!WebAssembly.validate(Buffer.from(match[1],'base64')))throw Error('Invalid embedded image encoder.');wasmCount++;}
  }
 }
 if(wasmCount!==2)throw Error('Both ordinary and SIMD image encoders must survive the editor build.');
 const html=await readFile(root+'/admin/rebuild.html','utf8');if(!html.includes('src="/admin/rebuild/editor.js"')||!html.includes('href="/admin/config.yml"'))throw Error('Candidate does not load the checked editor/config.');
 const old=await readFile(root+'/admin/index.html','utf8');if(!old.includes('src="/admin/decap-cms.js"'))throw Error('Do not replace the established editor during candidate testing.');
 const established=await readFile(root+'/admin/decap-cms.js');
 if(!established.equals(await readFile('node_modules/decap-cms/dist/decap-cms.js')))throw Error('Established editor bytes changed.');
 const licenses=JSON.parse(await readFile(root+'/admin/rebuild/licenses.json','utf8'));if(!licenses.some(l=>l.name==='decap-cms-core'&&l.text))throw Error('Decap licence missing.');
 return {modules:report.modules.length,assets:actual.length,wasmCount};
}
export async function verifyEditorNegativeControls(){
 const directory=await mkdtemp(join(tmpdir(),'throstle-editor-check-'));
 try{
  await mkdir(directory+'/admin');
  for(const name of ['config.yml','index.html','decap-cms.js','rebuild.html','rebuild'])await cp('build/admin/'+name,directory+'/admin/'+name,{recursive:true});
  const reportFile=directory+'/report.json';await cp('.cloudflare/editor-build.json',reportFile);
  const verify=()=>verifyEditorBuild({root:directory,reportFile});
  await verify();
  const mustFail=async pattern=>{try{await verify();}catch(error){if(pattern.test(error.message))return;throw error;}throw Error('Candidate verification accepted a broken control.');};
  const asset=directory+'/admin/rebuild/editor.js',original=await readFile(asset);
  await writeFile(asset,Buffer.concat([original,Buffer.from('\n// modified')]));await mustFail(/digest mismatch/);await writeFile(asset,original);
  const chunk=(await readdir(directory+'/admin/rebuild')).find(name=>name.startsWith('webp-'));
  if(!chunk)throw Error('No lazy image chunk to test.');
  const lazy=await readFile(directory+'/admin/rebuild/'+chunk);await rm(directory+'/admin/rebuild/'+chunk);await mustFail(/inventory differs/);await writeFile(directory+'/admin/rebuild/'+chunk,lazy);
  const report=JSON.parse(await readFile(reportFile,'utf8'));report.modules.push('node_modules/trim/index.js');await writeFile(reportFile,JSON.stringify(report));await mustFail(/Forbidden editor module/);
  return 3;
 }finally{await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await verifyEditorBuild();console.log(`PASS: candidate editor ${result.modules} modules, ${result.assets} exact assets and ${result.wasmCount} valid image encoders; current editor retained.`);}
