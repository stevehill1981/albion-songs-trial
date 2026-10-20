import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {adaptArchive} from './match-archive.mjs';
import {attributeManagers} from './manager-history.mjs';
export async function loadManagerContent(root=pathToFileURL(process.cwd()+'/')){
 const folder=async path=>Promise.all((await readdir(new URL(path,root))).filter(f=>f.endsWith('.json')).sort().map(async file=>{
  const record=JSON.parse(await readFile(new URL(path+file,root),'utf8'));
  if(file!==`${record.id}.json`)throw Error('Manager register filenames must match their stable identifiers.');return record;
 }));
 let managers;
 try{managers=await folder('content/managers/');}catch(error){if(error.code==='ENOENT')return {performance:{profiles:{}}};throw error;}
 const register={managers,tenures:await folder('content/manager-tenures/')};
 const raw=await readFile(new URL('public/data/results.json',root),'utf8');
 const archive=attributeManagers(adaptArchive('competitive',JSON.parse(raw)),register);
 return {archive,register,source:raw,performance:{profiles:Object.fromEntries(archive.managerProfiles.map(profile=>[profile.id,profile])),checkedAt:archive.checkedAt,sourceSha256:createHash('sha256').update(raw).digest('hex')}};
}
