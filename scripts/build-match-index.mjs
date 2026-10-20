import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {attributeManagers} from '../src/lib/manager-history.mjs';
import {createHash} from 'node:crypto';
import {adaptArchive,archiveGroups,matchSummary,PAGE_SIZE} from '../src/lib/match-archive.mjs';
export const ARCHIVE_FILES={competitive:'public/data/results.json',wartime:'public/data/wartime-results.json',annulled:'protected/historical-results.json'};
export const sha256=text=>createHash('sha256').update(text).digest('hex');
export async function buildMatchIndex({revision,output='public/data/museum-query'}={}){
 if(!/^(?:[a-f0-9]{40}|local-build)$/.test(revision||''))throw Error('A source revision is required for the archive index.');
 const records=async folder=>Promise.all((await readdir(folder)).filter(f=>f.endsWith('.json')).sort().map(async file=>JSON.parse(await readFile(`${folder}/${file}`,'utf8'))));
 const register={managers:await records('content/managers'),tenures:await records('content/manager-tenures')};
 const files=new Map();
 const put=value=>{const text=JSON.stringify(value)+'\n',hash=sha256(text),path=`files/${hash}.json`;if(Buffer.byteLength(text)>192*1024)throw Error('Archive index payload exceeds 192 KB.');files.set(path,text);return {path,sha256:hash,bytes:Buffer.byteLength(text)};};
 const manifest={schemaVersion:1,revision,pageSize:PAGE_SIZE,ledgers:{}};
 for(const [ledger,path]of Object.entries(ARCHIVE_FILES)){
  const raw=await readFile(path,'utf8'),data=JSON.parse(raw);
  let archive=adaptArchive(ledger,data);
  if(ledger==='competitive')archive=attributeManagers(archive,register);
  if(archive.managerProfiles){manifest.managers=archive.managerProfiles.map(profile=>({id:profile.id,name:profile.name,profile:put(profile)}));delete archive.managerProfiles;}
  const groups=archiveGroups(archive).map(({scope,value,matches})=>{
   const owner=scope==='manager'?value:scope==='tenure'?register.tenures.find(t=>t.id===value)?.manager:null;
   const warnings=owner==='unassigned'||value==='unassigned'?['This trial has no researched manager attribution for these records. Do not invent a manager.']:owner?register.managers.find(p=>p.id===owner)?.researchNotes||[]:[];
   const parts=[];for(let offset=0;offset<matches.length;offset+=PAGE_SIZE)parts.push({...put({ledger,matches:matches.slice(offset,offset+PAGE_SIZE)}),offset,count:Math.min(PAGE_SIZE,matches.length-offset)});
   return {scope,value,summary:matchSummary(matches),parts,warnings};
  });
  // Group descriptors are loaded only for the chosen scope; the small catalog lists exact names.
  const catalog={ledger,groups:groups.map(({scope,value,summary,...group})=>({scope,value,count:summary.played,descriptor:put({ledger,scope,value,summary,...group})}))};
  const {matches,...metadata}=archive;
  manifest.ledgers[ledger]={...put(catalog),sourcePath:path,sourceSha256:sha256(raw),checkedAt:archive.checkedAt,currentSeason:archive.currentSeason,coverage:put(metadata),summary:matchSummary(matches)};
 }
 const manifestText=JSON.stringify(manifest)+'\n';
 await rm(output,{recursive:true,force:true});await mkdir(`${output}/files`,{recursive:true});
 for(const [path,text]of files)await writeFile(`${output}/${path}`,text);
 await writeFile(`${output}/manifest.json`,manifestText);
 return {manifest,files};
}
