import site from '../../site.json' with {type:'json'};
import {ArchiveError,LEDGERS,PAGE_SIZE,planQuery,refineMatches,matchSummary,validateQuery} from '../../src/lib/match-archive.mjs';
const fail=(ok,message)=>{if(!ok)throw new ArchiveError(message);};
const root='/data/museum-query/';
// Only verified public immutable assets are shared. Never retain request promises,
// manifests, authorization, credentials or calculated query results here.
const assetCaches=new WeakMap();
const CACHE_ENTRIES=16,CACHE_BYTES=512*1024;
function freezeAsset(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeAsset(child);Object.freeze(value);}return value;}
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function json(fetcher,path,{maximum=192*1024,sha256,bytes}={}){
 fail(path==='/version.json'||path===root+'manifest.json'||/^\/data\/museum-query\/files\/[a-f0-9]{64}\.json$/.test(path),'Invalid archive asset path.');
 const response=await fetcher(site.origin+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});
 fail(response.ok,'The published archive asset is unavailable. Retry after publication finishes.');
 const reader=response.body?.getReader();fail(reader,'The archive response is missing.');const chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maximum){await reader.cancel();throw new ArchiveError('Archive payload exceeds its safe size.');}chunks.push(value);}}finally{reader.releaseLock();}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
 if(sha256)fail(length===bytes&&await hash(data)===sha256,'The archive snapshot changed or failed its integrity check. Retry the complete query.');
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{throw new ArchiveError('Invalid archive JSON.');}
}
export function createArchiveClient(fetcher=fetch){
 let cache=assetCaches.get(fetcher);if(!cache){cache={entries:new Map(),bytes:0};assetCaches.set(fetcher,cache);}
 async function snapshot(){
  const [version,manifest]=await Promise.all([json(fetcher,'/version.json',{maximum:4096}),json(fetcher,root+'manifest.json',{maximum:16384})]);
  fail(manifest.schemaVersion===1&&/^[a-f0-9]{40}$/.test(manifest.revision)&&manifest.revision===version.revision,'The archive manifest and published site are out of sync. Retry after publication finishes.');
  fail(LEDGERS.every(key=>manifest.ledgers?.[key]),'The archive manifest is incomplete.');return manifest;
 }
 const asset=async ref=>{
  fail(ref&&/^files\/[a-f0-9]{64}\.json$/.test(ref.path)&&ref.path===`files/${ref.sha256}.json`&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0&&ref.bytes<=192*1024,'Invalid archive asset reference.');
  const cached=cache.entries.get(ref.sha256);
  if(cached){fail(cached.bytes===ref.bytes,'The archive snapshot changed or failed its integrity check. Retry the complete query.');return cached.value;}
  const value=freezeAsset(await json(fetcher,root+ref.path,ref));
  // Another request may have completed this same asset while ours was in flight.
  if(!cache.entries.has(ref.sha256)){
   while(cache.entries.size>=CACHE_ENTRIES||cache.bytes+ref.bytes>CACHE_BYTES){const [key,old]=cache.entries.entries().next().value;cache.entries.delete(key);cache.bytes-=old.bytes;}
   cache.entries.set(ref.sha256,{value,bytes:ref.bytes});cache.bytes+=ref.bytes;
  }
  return value;
 };
 function provenance(manifest,ledger){const source=manifest.ledgers[ledger];return {revision:manifest.revision,ledger,sourcePath:source.sourcePath,sourceSha256:source.sourceSha256,checkedAt:source.checkedAt,currentSeason:source.currentSeason,coverageURL:site.origin+root+source.coverage.path,limitations:'Published snapshot, not live. Coverage and outstanding discrepancies are documented by archive_coverage. Keep competitive, wartime/recovery and annulled totals separate. Unclassified evidence does not mean corroborated.'};}
 async function query(input,includeMatches){
  const filters=validateQuery(input),manifest=await snapshot(),entry=manifest.ledgers[filters.ledger];
  const catalog=await asset(entry);fail(catalog.ledger===filters.ledger&&Array.isArray(catalog.groups),'Wrong archive catalog.');
  const {group,residual}=planQuery(catalog,filters),descriptor=await asset(group.descriptor);
  fail(descriptor.ledger===filters.ledger&&descriptor.scope===group.scope&&descriptor.value===group.value&&descriptor.summary?.played===group.count&&Array.isArray(descriptor.parts),'Wrong archive group.');
  let summary=descriptor.summary,rows=[];const page=filters.page||1,offset=(page-1)*PAGE_SIZE;
  if(residual||includeMatches){
   const parts=residual?descriptor.parts:descriptor.parts.filter(part=>part.offset===offset);
   fail(parts.length<=10,'Too many archive parts. Narrow the query.');
   for(const part of parts){const data=await asset(part);fail(data.ledger===filters.ledger&&Array.isArray(data.matches)&&data.matches.length===part.count&&data.matches.every(m=>m.ledger===filters.ledger),'Wrong archive part.');rows.push(...data.matches);}
   if(residual){fail(rows.length===group.count,'The archive group is incomplete; no partial totals returned.');rows=refineMatches(rows,filters);summary=matchSummary(rows);rows=rows.slice(offset,offset+PAGE_SIZE);}
  }
  const pages=Math.ceil(summary.played/PAGE_SIZE);fail(page===1||page<=pages,'This page is outside the matched results.');
  return {...provenance(manifest,filters.ledger),filters,summary,warnings:descriptor.warnings||[],...(includeMatches?{page,pageSize:PAGE_SIZE,totalPages:pages,nextPage:page<pages?page+1:null,matches:rows}:{})};
 }
 return {
  async coverage({ledger}={}){
   fail(ledger===undefined||LEDGERS.includes(ledger),'Choose a known ledger.');const manifest=await snapshot();
   if(!ledger)return {revision:manifest.revision,ledgers:Object.fromEntries(LEDGERS.map(key=>[key,{...provenance(manifest,key),summary:manifest.ledgers[key].summary}])),next:'Call archive_coverage with one ledger for exact scope values, source credits and unresolved gaps.'};
   const entry=manifest.ledgers[ledger],[catalog,metadata]=await Promise.all([asset(entry),asset(entry.coverage)]);
   return {...provenance(manifest,ledger),summary:entry.summary,...metadata,scopes:catalog.groups.filter(g=>g.scope!=='all').map(({scope,value,count})=>({scope,value,count})),queryRules:'Exact scope names; aliases Wolves, Villa and Birmingham are accepted. 25 matches per page, newest first. Combined queries require at most 250 candidate records. Use one season or smaller scope when asked. A missing scope is unknown coverage, not a zero result.'};
  },
  async managers(){const manifest=await snapshot();return {revision:manifest.revision,scope:'Three researched profiles only; not the complete manager history.',managers:(manifest.managers||[]).map(({id,name})=>({id,name}))};},
  async manager({id}){const manifest=await snapshot();const entry=manifest.managers?.find(p=>p.id===id);fail(entry,'This manager has no researched profile in the trial register.');return {revision:manifest.revision,...await asset(entry.profile)};},
  matches:input=>query(input,true),summary:input=>query(input,false),
 };
}
