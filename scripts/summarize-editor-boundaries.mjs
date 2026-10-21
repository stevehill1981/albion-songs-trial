import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {summarizeProfile} from './test-support/editor-profile.mjs';
const directory=resolve(process.argv[2]||'');assert(process.argv[2],'Supply the bounded evidence directory');
const rows=[],captures=[];let revision,digest;
const median=values=>[...values].sort((a,b)=>a-b)[1];
for(const workload of ['read','save'])for(const condition of ['fresh','preloaded']){
 const phases=condition==='fresh'?['first-pre-upstream','first-post-upstream','repeat-pre-upstream','repeat-post-upstream']:['unsigned-startup','first-pre-upstream','first-post-upstream','repeat-pre-upstream','repeat-post-upstream'];
 for(let run=1;run<=3;run++){
  const label=`${workload}-${condition}-${run}`,evidence=JSON.parse(await readFile(join(directory,label+'.json'),'utf8'));
  assert.equal(evidence.label,label);assert(/^[a-f0-9]{40}$/.test(evidence.revision)&&/^[a-f0-9]{64}$/.test(evidence.bundleDigest));
  revision??=evidence.revision;digest??=evidence.bundleDigest;assert.equal(evidence.revision,revision);assert.equal(evidence.bundleDigest,digest,'Do not mix compiled baselines');
  assert.deepEqual(evidence.phases.map(row=>row.phase),phases);
  assert.equal(evidence.calls.length,2);assert(evidence.calls.every(row=>row.calls.length===(workload==='read'?3:9)));
  assert(basename(evidence.temporaryDirectory).startsWith('albion-editor-boundaries-'));
  await assert.rejects(access(evidence.temporaryDirectory),{code:'ENOENT'},'Task runtime directory must be disposed');
  for(const phase of evidence.phases){
   assert.equal(phase.file,`${label}-${phase.phase}.cpuprofile`);
   const summary=summarizeProfile(JSON.parse(await readFile(join(directory,phase.file),'utf8')));
   captures.push({workload,condition,run,phase:phase.phase,...summary});
  }
 }
 for(const phase of phases){
  const selected=captures.filter(row=>row.workload===workload&&row.condition===condition&&row.phase===phase);
  assert.equal(selected.length,3);const samples=selected.map(row=>row.activeSamples),groups={};
  for(const row of selected)for(const [group,value]of Object.entries(row.groups))if(group!=='idle')groups[group]=(groups[group]||0)+value;
  rows.push({workload,condition,phase,samples,medianActiveSamples:median(samples),range:[Math.min(...samples),Math.max(...samples)],combinedSelfSamples:groups});
 }
}
assert.equal(captures.length,54);
const result={revision,bundleDigest:digest,successfulRuntimes:12,usableProfiles:54,rows,captures,limitations:'Three observations per condition/phase, local V8 samples only. Split boundaries omit inspector work while sampling is stopped. Isolate construction/eager bootstrap precede attachment. Group names locate self samples, not pure causal costs; stream decoding is shared by incoming and upstream bodies. Do not subtract independent captures or convert to hosted CPU milliseconds.'};
await writeFile(join(directory,'summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({revision,successfulRuntimes:12,usableProfiles:54,rows},null,2));
