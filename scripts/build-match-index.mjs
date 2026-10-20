import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {adaptArchive,archiveGroups,matchSummary,PAGE_SIZE} from '../src/lib/match-archive.mjs';
export const ARCHIVE_FILES={competitive:'public/data/results.json',wartime:'public/data/wartime-results.json',annulled:'protected/historical-results.json'};
export const sha256=text=>createHash('sha256').update(text).digest('hex');
export async function buildMatchIndex({revision,output='public/data/museum-query'}={}){
 if(!/^(?:[a-f0-9]{40}|local-build)$/.test(revision||''))throw Error('A source revision is required for the archive index.');
 const files=new Map();
 const put=value=>{const text=JSON.stringify(value)+'\n',hash=sha256(text),path=`files/${hash}.json`;if(Buffer.byteLength(text)>192*1024)throw Error('Archive index payload exceeds 192 KB.');files.set(path,text);return {path,sha256:hash,bytes:Buffer.byteLength(text)};};
 const manifest={schemaVersion:1,revision,pageSize:PAGE_SIZE,ledgers:{}};
 for(const [ledger,path]of Object.entries(ARCHIVE_FILES)){
  const raw=await readFile(path,'utf8'),data=JSON.parse(raw),archive=adaptArchive(ledger,data);
  const groups=archiveGroups(archive).map(({scope,value,matches})=>{
   const parts=[];for(let offset=0;offset<matches.length;offset+=PAGE_SIZE)parts.push({...put({ledger,matches:matches.slice(offset,offset+PAGE_SIZE)}),offset,count:Math.min(PAGE_SIZE,matches.length-offset)});
   return {scope,value,summary:matchSummary(matches),parts};
  });
  // Group descriptors are loaded only for the chosen scope; the small catalog lists exact names.
  const catalog={ledger,groups:groups.map(({scope,value,summary,...group})=>({scope,value,count:summary.played,descriptor:put({ledger,scope,value,summary,...group})}))};
  const {matches,...metadata}=archive;
  manifest.ledgers[ledger]={...put(catalog),sourcePath:path,sourceSha256:sha256(raw),coverage:put(metadata),summary:matchSummary(matches)};
 }
 const manifestText=JSON.stringify(manifest)+'\n';
 await rm(output,{recursive:true,force:true});await mkdir(`${output}/files`,{recursive:true});
 for(const [path,text]of files)await writeFile(`${output}/${path}`,text);
 await writeFile(`${output}/manifest.json`,manifestText);
 return {manifest,files};
}
