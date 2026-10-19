import { execFileSync } from 'node:child_process';
import { readFileSync,readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {photoURL,uploadPathPattern} from '../src/lib/image-paths.mjs';
const uploadPath=path=>path.startsWith('public/uploads/')&&uploadPathPattern.test(path.slice('public'.length))&&!path.includes('..');
export function checkEditorialPaths(paths){
 if(!paths.length)throw Error('An editorial draft must contain a content change.');
 for(const path of paths)if(!uploadPath(path)&&path!=='content/fact.json'&&!['content/settings/quiz.json','content/settings/catalogue.json','content/settings/navigation.json'].includes(path)&&!/^content\/(pages|collections|page-templates|exhibits|eras|sources|photographs)\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.json$/.test(path))throw Error(`Editorial drafts cannot change ${path}.`);
}
export function checkUploadChanges(changes,photographs){
 checkEditorialPaths(changes.map(c=>c.path));
 const referenced=new Set(photographs.map(p=>'public'+photoURL(p.file)));
 for(const {status,path}of changes.filter(c=>c.path.startsWith('public/uploads/'))){
  if(status!=='A')throw Error('Published image files cannot be overwritten or removed. Upload a new filename and update the photograph selection.');
  if(!referenced.has(path))throw Error(`Add a credited photograph record for ${path} before saving this draft.`);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const parts=execFileSync('git',['-c','core.fsmonitor=false','diff','--name-status','--no-renames','-z','origin/main...HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
 const changes=[];for(let i=0;i<parts.length;i+=2)changes.push({status:parts[i],path:parts[i+1]});
 const photographs=readdirSync('content/photographs').filter(n=>n.endsWith('.json')).map(n=>JSON.parse(readFileSync(`content/photographs/${n}`,'utf8')));
 checkUploadChanges(changes,photographs);console.log('PASS: editorial JSON and newly credited image uploads only; published assets are retained.');
}
