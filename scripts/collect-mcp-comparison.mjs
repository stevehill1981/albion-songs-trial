// Read-only collection. Raw request headers, bodies, tokens and query strings
// never leave memory; the durable receipt contains only comparison metadata.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const [callsPath,versionsPath,outputPath]=process.argv.slice(2);assert(callsPath&&versionsPath&&outputPath,'Supply calls, recorded versions and sanitized output paths.');
const calls=JSON.parse(await readFile(callsPath)),versions=JSON.parse(await readFile(versionsPath));assert(Array.isArray(calls)&&calls.length>0);
const times=calls.flatMap(call=>[Date.parse(call.startedAt),Date.parse(call.at)]);assert(times.every(Number.isFinite),'Every primary receipt needs start and end times.');
const {accountId}=JSON.parse(await readFile(new URL('../auth/mcp-config.json',import.meta.url)));
const body={queryId:'albion-lean-hosted',timeframe:{from:Math.min(...times)-1000,to:Math.max(...times)+1000},view:'events',limit:1000,parameters:{filters:[{key:'$metadata.service',operation:'eq',type:'string',value:'albion-songs-auth'}]}};
const result=spawnSync('mise',['exec','node@24.9.0','--','cf','o11y','telemetry','query','--body',JSON.stringify(body)],{encoding:'utf8',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:accountId},timeout:30000,maxBuffer:12*1024*1024});assert.equal(result.status,0,'Read-only telemetry query failed.');
const rows=JSON.parse(result.stdout).events.events;assert(Array.isArray(rows)&&rows.length<1000,'Telemetry is empty-shaped or truncated; narrow the query before assessing it.');
const events=rows.filter(row=>row.$workers?.event?.request).map(row=>{
 const worker=row.$workers;return{at:new Date(row.timestamp).toISOString(),path:new URL(worker.event.request.url).pathname,method:worker.event.request.method,status:worker.event.response?.status,...Number.isFinite(worker.cpuTimeMs)?{cpuMs:worker.cpuTimeMs}:{},outcome:worker.outcome,version:worker.scriptVersion?.id};
}).filter(event=>event.path==='/mcp'&&event.method==='POST');
const used=new Set(),matched=calls.map(call=>{
 const phase=call.phase.split('-')[0],version=versions[phase];assert(typeof version==='string','Record every tested phase version before matching.');
 const candidates=events.map((event,index)=>({event,index})).filter(({event,index})=>!used.has(index)&&event.version===version&&Date.parse(event.at)>=Date.parse(call.startedAt)-5&&Date.parse(event.at)<=Date.parse(call.at)+100);
 // Completion timestamps normally precede the receipt by one network hop.
 // A very close competing event makes the match ambiguous, never a zero CPU.
 candidates.sort((a,b)=>Math.abs(Date.parse(a.event.at)-Date.parse(call.at))-Math.abs(Date.parse(b.event.at)-Date.parse(call.at)));
 if(!candidates.length)return{...call,unmatched:true};
 if(candidates.length>1&&Math.abs(Math.abs(Date.parse(candidates[0].event.at)-Date.parse(call.at))-Math.abs(Date.parse(candidates[1].event.at)-Date.parse(call.at)))<20)return{...call,ambiguous:true};
 used.add(candidates[0].index);return{...call,invocation:candidates[0].event};
});
const quantile=(values,q)=>values[Math.max(0,Math.ceil(q*values.length)-1)];
const summarize=selected=>{
 const cpu=selected.flatMap(call=>Number.isFinite(call.invocation?.cpuMs)?[call.invocation.cpuMs]:[]).sort((a,b)=>a-b);
 return{calls:selected.length,succeeded:selected.filter(call=>call.result?.isError===false).length,timed:cpu.length,...cpu.length?{min:cpu[0],median:quantile(cpu,.5),p95:quantile(cpu,.95),max:cpu.at(-1),over10:cpu.filter(ms=>ms>10).length,over10Rate:cpu.filter(ms=>ms>10).length/cpu.length}: {},badInvocations:selected.filter(call=>call.invocation&&(call.invocation.outcome!=='ok'||call.invocation.status!==200)).length};
};
const summary={};for(const phase of ['baseline','lean','restored']){
 const selected=matched.filter(call=>call.phase.startsWith(phase+'-'));if(!selected.length)continue;
 summary[phase]={...summarize(selected),lanes:Object.fromEntries(['default','legacy','modern'].filter(lane=>selected.some(call=>call.lane===lane)).map(lane=>[lane,summarize(selected.filter(call=>call.lane===lane))])),pausedAndHeavy:summarize(selected.filter(call=>call.phase.endsWith('-paused')||call.tool==='read_content'))};
}
const evidence={format:1,versions,calls:matched,events,summary,correlation:'Same expected version, POST /mcp, request interval with 5 ms start/100 ms completion tolerance, nearest completion; candidates within 20 ms are ambiguous. Missing/ambiguous telemetry is unknown. Default client is the installed SDK legacy lane. Only explicitly recorded primary reads are summarized.'};
await writeFile(outputPath,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(summary));
