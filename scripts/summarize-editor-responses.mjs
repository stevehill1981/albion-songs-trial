import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {join,resolve,basename} from 'node:path';
import {summarizeProfile} from './test-support/editor-profile.mjs';
assert(process.argv[2],'Supply the response evidence directory');const directory=resolve(process.argv[2]);
const rows=[],captures=[];let digest,revision,replayDigest;
const phases=['unsigned-startup','first-pre-upstream','first-post-upstream','repeat-whole'];
for(const mode of ['compact','public-single','public-chunked'])for(const workload of ['read','save']){
 const payloads=[];
 for(let run=1;run<=3;run++){
  const label=`${workload}-preloaded-${run}`,data=JSON.parse(await readFile(join(directory,mode,label+'.json'),'utf8'));
  assert.equal(data.responseMode,mode);assert.equal(data.label,label);assert.deepEqual(data.phases.map(row=>row.phase),phases);
  digest??=data.bundleDigest;revision??=data.revision;assert.equal(data.bundleDigest,digest);assert.equal(data.revision,revision);
  if(mode!=='compact'){replayDigest??=data.replayDigest;assert.equal(data.replayDigest,replayDigest);}
  assert(basename(data.temporaryDirectory).startsWith('albion-editor-boundaries-'));await assert.rejects(access(data.temporaryDirectory),{code:'ENOENT'});
  assert.equal(data.calls.length,2);
  for(const attempt of data.calls){
   assert.equal(attempt.calls.length,workload==='read'?3:9);assert.deepEqual(attempt.calls.slice(0,2).map(row=>row.path),['','/git/ref/heads/main']);
   if(mode!=='compact'){
    assert.equal(attempt.responseModels.length,attempt.calls.length);
    for(const response of attempt.responseModels)assert.equal(response.emittedChunks,mode==='public-single'?1:Math.ceil(response.bytes/1024));
    payloads.push({bytes:attempt.responseModels.reduce((n,row)=>n+row.bytes,0),hostEmittedChunks:attempt.responseModels.reduce((n,row)=>n+row.emittedChunks,0)});
   }
  }
  for(const phase of data.phases){assert.equal(phase.file,`${label}-${phase.phase}.cpuprofile`);captures.push({mode,workload,run,phase:phase.phase,...summarizeProfile(JSON.parse(await readFile(join(directory,mode,phase.file),'utf8')))});}
 }
 for(const phase of phases){
  const selected=captures.filter(row=>row.mode===mode&&row.workload===workload&&row.phase===phase),values=selected.map(row=>row.activeSamples);assert.equal(values.length,3);
  const sorted=[...values].sort((a,b)=>a-b);rows.push({mode,workload,phase,activeSamples:values,median:sorted[1],range:[sorted[0],sorted[2]],...(payloads.length?{modelBytesPerOperation:[...new Set(payloads.map(row=>row.bytes))],hostChunksPerOperation:[...new Set(payloads.map(row=>row.hostEmittedChunks))]}:{})});
 }
}
assert.equal(captures.length,72);
const result={revision,bundleDigest:digest,replayDigest,successfulRuntimes:18,usableProfiles:72,rows,captures,limitations:'Local V8 samples, three ordered observations per mode/workload; not hosted milliseconds or causal proof. Isolate creation precedes inspector attachment. Full response JSON and write responses are models derived from public GETs. Chunk counts are host emissions; simulator transport may coalesce them. Synthetic 1 ms delays omit GitHub TLS, compression and actual delivery timing.'};
await writeFile(join(directory,'summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({revision,successfulRuntimes:18,usableProfiles:72,rows:rows.filter(row=>row.phase==='first-post-upstream'||row.phase==='repeat-whole')},null,2));
