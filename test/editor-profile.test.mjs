import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeProfile} from '../scripts/test-support/editor-profile.mjs';
const frame=(id,functionName,url='',lineNumber=0)=>({id,callFrame:{functionName,url,lineNumber}});
const profile={startTime:1,endTime:100,nodes:[frame(1,'(idle)'),frame(2,'handleRequest','file:///entry.mjs'),frame(3,'record','file:///editor-api_test.mjs'),frame(4,'(garbage collector)'),frame(5,'','file:///editor-api_test.mjs',-1),frame(6,'(program)'),frame(7,'validatePage','file:///component-preview_test.mjs'),frame(8,'boundedText','file:///editor-api_test.mjs')],samples:[1,2,2,3,4,5,6,7,8]};
test('profile self samples separate framework, module startup and client work without counting idle as work',()=>{
 const result=summarizeProfile(profile);
 assert.equal(result.activeSamples,8);
 assert.equal(result.groups.framework,2);assert.equal(result.groups['github-client'],1);
 assert.equal(result.groups['module-initialization'],1);assert.equal(result.groups.validation,1);
 assert.equal(result.groups.gc,1);assert.equal(result.groups.unattributed,1);
 assert.equal(result.groups['stream-decoding'],1,'Incoming request and upstream bodies share this helper; do not call all of it GitHub work');
 assert.equal(Object.values(result.groups).reduce((a,b)=>a+b,0),profile.samples.length);
 assert(result.top.some(row=>row.function==='record'&&row.module==='editor-api_test.mjs'));
});
test('missing, idle-only, corrupt and unmatched profile samples fail rather than produce reassuring zeroes',()=>{
 for(const invalid of [{...profile,samples:[]},{...profile,samples:[1,1]},{...profile,samples:[999]},{...profile,endTime:1},{...profile,timeDeltas:[1]},{...profile,nodes:[...profile.nodes,profile.nodes[0]]},{...profile,nodes:[{id:1}]}])assert.throws(()=>summarizeProfile(invalid));
});
