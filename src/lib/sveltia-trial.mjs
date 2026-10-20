import {readFile,readdir} from 'node:fs/promises';
import {validatePage} from './blocks.mjs';
export function validateTrialPath(path){
 if(typeof path!=='string'||!/^managers(?:\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*){0,3}$/.test(path))throw Error('Use a nested page below the trial managers folder.');
 return path;
}
export async function loadTrialPages({directory='content/sveltia-trial'}={}){
 const pages=[];
 const walk=async(relative='')=>{for(const entry of await readdir(directory+(relative?'/'+relative:''),{withFileTypes:true})){
  const path=relative?relative+'/'+entry.name:entry.name;
  if(entry.isSymbolicLink())throw Error('Trial content cannot contain symbolic links.');
  if(entry.isDirectory()){validateTrialPath(path);await walk(path);}
  else if(entry.name==='index.json'){
   validateTrialPath(relative);const page=validatePage(JSON.parse(await readFile(directory+'/'+path,'utf8')));
   if(page.slug!==relative.split('/').at(-1))throw Error('The trial folder and page address must agree.');
   pages.push({path:relative,file:directory+'/'+path,page});
  }else throw Error('Trial content must use index.json inside page folders.');
 }};await walk();
 if(!pages.length)throw Error('The trial needs its managers overview.');
 const known=new Set(pages.map(p=>p.path));
 if(!known.has('managers'))throw Error('The trial needs its managers overview.');
 for(const {path} of pages)if(path.includes('/')&&!known.has(path.slice(0,path.lastIndexOf('/'))))throw Error('Create the parent page before its children.');
 return pages.sort((a,b)=>a.path.localeCompare(b.path));
}
export function trialBreadcrumbs(path,pages){
 validateTrialPath(path);const segments=path.split('/');return segments.map((_,i)=>{const parent=segments.slice(0,i+1).join('/');const entry=pages.find(p=>p.path===parent);if(!entry)throw Error('Missing parent page.');return{label:entry.page.title,href:'/sveltia-trial/'+parent};});
}
