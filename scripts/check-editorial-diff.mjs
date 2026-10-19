import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export function checkEditorialPaths(paths){
 if(!paths.length)throw Error('An editorial draft must contain a content change.');
 for(const path of paths)if(path!=='content/fact.json'&&!/^content\/(pages|collections)\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.json$/.test(path))throw Error(`Editorial drafts cannot change ${path}.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const paths=execFileSync('git',['-c','core.fsmonitor=false','diff','--name-only','-z','origin/main...HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
 checkEditorialPaths(paths);console.log('PASS: every changed file is an allowed editorial JSON file.');
}
