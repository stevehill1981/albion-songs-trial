import assert from 'node:assert/strict';

function group(frame){
 const name=frame.functionName,file=frame.url.split('/').at(-1);
 if(name==='(idle)')return 'idle';
 if(name==='(garbage collector)')return 'gc';
 if(name==='(program)'||name==='(root)')return 'unattributed';
 if(!frame.url)return 'native-runtime';
 if(!name&&frame.lineNumber<0)return 'module-initialization';
 if(name==='freezeGuide')return 'authoring-metadata';
 if(name==='boundedText')return 'stream-decoding';
 if(file==='entry.mjs'||file.startsWith('compiler_'))return 'framework';
 if(file.startsWith('component-preview_'))return 'validation';
 if(file.startsWith('editor-api_'))return ['editorOperation','reply','failure','ALL'].includes(name)?'editor-boundary':'github-client';
 return 'other-code';
}

export function summarizeProfile(profile){
 assert(profile&&Array.isArray(profile.nodes)&&Array.isArray(profile.samples)&&profile.samples.length>0,'Missing sampled frames');
 assert(Number.isFinite(profile.startTime)&&Number.isFinite(profile.endTime)&&profile.endTime>profile.startTime,'Invalid profile duration');
 const nodes=new Map(),counts=new Map(),groups={};
 for(const node of profile.nodes){
  const f=node.callFrame;
  assert(Number.isSafeInteger(node.id)&&!nodes.has(node.id)&&f&&typeof f.functionName==='string'&&typeof f.url==='string'&&Number.isInteger(f.lineNumber),'Invalid or duplicate frame');
  nodes.set(node.id,node);
 }
 if(profile.timeDeltas!==undefined)assert(Array.isArray(profile.timeDeltas)&&profile.timeDeltas.length===profile.samples.length&&profile.timeDeltas.every(n=>Number.isFinite(n)&&n>=0),'Invalid sample timing');
 for(const id of profile.samples){
  const node=nodes.get(id);assert(node,'Sample references an unknown frame');
  const category=group(node.callFrame);groups[category]=(groups[category]||0)+1;
  counts.set(id,(counts.get(id)||0)+1);
 }
 const totalSamples=profile.samples.length,activeSamples=totalSamples-(groups.idle||0);
 assert(activeSamples>0,'An idle-only capture cannot measure the handler');
 assert.equal(Object.values(groups).reduce((a,b)=>a+b,0),totalSamples,'Self samples must partition without double counting');
 const top=[...counts].filter(([id])=>group(nodes.get(id).callFrame)!=='idle').sort((a,b)=>b[1]-a[1]).slice(0,12).map(([id,samples])=>{
  const frame=nodes.get(id).callFrame;
  return {function:frame.functionName,module:frame.url.split('/').at(-1),line:frame.lineNumber+1,samples,group:group(frame)};
 });
 return {totalSamples,activeSamples,groups,top};
}
