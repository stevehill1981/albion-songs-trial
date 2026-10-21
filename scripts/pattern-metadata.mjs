// The HTML catalogue is authoritative. Checking never rewrites its projection.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const catalogueURL=new URL('../src/lib/museum-patterns.json',import.meta.url);
const metadataURL=new URL('../src/lib/pattern-metadata.json',import.meta.url);
export function derivePatternMetadata(source){
 const catalogue=JSON.parse(source);
 if(!Array.isArray(catalogue)||!catalogue.length||catalogue.some(p=>!p||typeof p.name!=='string'||!p.name||typeof p.template!=='string'||!p.template.trim()||!Array.isArray(p.fields))||new Set(catalogue.map(p=>p.name)).size!==catalogue.length)throw Error('The authoritative pattern catalogue is incomplete.');
 return {sourceSha256:createHash('sha256').update(source).digest('hex'),patterns:catalogue.map(({template,...metadata})=>metadata)};
}
export function assertPatternMetadata(source,metadata){
 if(!isDeepStrictEqual(metadata,derivePatternMetadata(source)))throw Error('Pattern metadata is stale. Review the catalogue, then run node scripts/pattern-metadata.mjs --write and commit its projection.');
}
export async function checkPatternMetadata({catalogue=catalogueURL,metadata=metadataURL}={}){
 assertPatternMetadata(await readFile(catalogue,'utf8'),JSON.parse(await readFile(metadata,'utf8')));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length!==3||!['--check','--write'].includes(process.argv[2]))throw Error('Choose --check or explicit --write for pattern metadata.');
  if(process.argv[2]==='--write')await writeFile(metadataURL,JSON.stringify(derivePatternMetadata(await readFile(catalogueURL,'utf8')))+'\n');
  else await checkPatternMetadata();
  console.log('PASS: pattern metadata matches the authoritative catalogue.');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
