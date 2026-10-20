// Summarize local V8 sampling evidence, not hosted per-request CPU compliance.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';
const paths=process.argv.slice(2);assert(paths.length>0,'Supply at least one local V8 CPU profile.');
const profiles=[];
for(const path of paths){
 const profile=JSON.parse(await readFile(path,'utf8'));
 assert(Array.isArray(profile.nodes)&&Array.isArray(profile.samples)&&profile.samples.length>0,'The profile must contain sampled frames.');
 assert(profile.endTime>profile.startTime,'The profile must have a positive duration.');
 const nodes=new Map(profile.nodes.map(node=>[node.id,node])),counts=new Map();
 for(const id of profile.samples){const node=nodes.get(id);assert(node,'Sample references an unknown frame.');const name=node.callFrame.functionName;counts.set(name,(counts.get(name)||0)+1);}
 const totalSamples=profile.samples.length,idleSamples=counts.get('(idle)')||0;
 assert(totalSamples>idleSamples,'An idle-only capture cannot measure the handler.');
 profiles.push({profile:basename(path),elapsedMs:(profile.endTime-profile.startTime)/1000,totalSamples,idleSamples,activeSamples:totalSamples-idleSamples,gcSamples:counts.get('(garbage collector)')||0,unattributedProgramSamples:counts.get('(program)')||0,
  setupSelfSamples:Object.fromEntries([...counts].filter(([name])=>/^(?:registerTool|_createRegisteredTool|createToolExecutor|createMuseumServer|createLeanMuseumServer|convertListedInputSchema|setToolRequestHandlers)$/.test(name))),
  topSelfSamples:[...counts].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([functionName,samples])=>({functionName,samples}))});
}
console.log(JSON.stringify({format:1,limitations:'Local V8 sampling, including compiled OAuth acceptance and the selected bounded workload. Active samples exclude only idle and include unattributed program samples. Elapsed duration includes waits; neither sample counts nor elapsed time establish hosted per-request CPU limits. Missing function samples do not prove zero work.',profiles},null,2));
