import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createArchiveClient} from '../auth/mcp/archive.mjs';

function harness({count=1,padding=0}={}){
 const files=new Map(),calls=[];
 const reference=value=>{const body=JSON.stringify(value),sha256=createHash('sha256').update(body).digest('hex'),path=`files/${sha256}.json`;files.set(path,body);return {path,sha256,bytes:Buffer.byteLength(body)};};
 const manifest={schemaVersion:1,revision:'a'.repeat(40),ledgers:{competitive:{},wartime:{},annulled:{}},managers:Array.from({length:count},(_,i)=>({id:`manager-${i}`,profile:reference({id:`manager-${i}`,sources:[{url:'https://www.wba.co.uk/'}],padding:'x'.repeat(padding)})}))};
 let revision=manifest.revision,corrupt=false;
 const fetcher=async url=>{const path=new URL(url).pathname;calls.push(path);if(path==='/version.json')return Response.json({revision});if(path.endsWith('/manifest.json'))return Response.json(manifest);const body=files.get(path.replace('/data/museum-query/',''));assert(body);return new Response(corrupt?body+' ':body);};
 return {client:createArchiveClient(fetcher),fetcher,calls,manifest,reference,set(values){({revision=revision,corrupt=corrupt}=values);}};
}
const assetCalls=h=>h.calls.filter(path=>path.includes('/files/')).length;

test('verified immutable assets are reused across clients but freshness and provenance are reread',async()=>{
 const h=harness(),first=await h.client.manager({id:'manager-0'});
 assert.throws(()=>first.sources[0].url='https://example.com/',TypeError);
 const again=await createArchiveClient(h.fetcher).manager({id:'manager-0'});
 assert.deepEqual(again,first);assert.equal(assetCalls(h),1);
 assert.equal(h.calls.filter(p=>p==='/version.json').length,2);
 assert.equal(h.calls.filter(p=>p.endsWith('/manifest.json')).length,2);
 h.set({revision:'b'.repeat(40)});await assert.rejects(h.client.manager({id:'manager-0'}),/out of sync/);
 h.manifest.revision='b'.repeat(40);assert.equal((await h.client.manager({id:'manager-0'})).revision,'b'.repeat(40));assert.equal(assetCalls(h),1);
 h.manifest.managers[0].profile=h.reference({sources:[{url:'https://www.wba.co.uk/new'}]});
 assert.equal((await h.client.manager({id:'manager-0'})).sources[0].url,'https://www.wba.co.uk/new');assert.equal(assetCalls(h),2);
 const isolated=harness();await isolated.client.manager({id:'manager-0'});assert.equal(assetCalls(isolated),1,'Different fetchers cannot share a cache');
});

test('corrupt files and changed reference lengths fail closed without poisoning the cache',async()=>{
 const h=harness();h.set({corrupt:true});await assert.rejects(h.client.manager({id:'manager-0'}),/integrity/);
 h.set({corrupt:false});await h.client.manager({id:'manager-0'});assert.equal(assetCalls(h),2);
 h.manifest.managers[0].profile.bytes++;await assert.rejects(h.client.manager({id:'manager-0'}),/integrity/);
 h.manifest.managers[0].profile.bytes--;h.manifest.managers[0].profile.path='files/'+'b'.repeat(64)+'.json';
 await assert.rejects(h.client.manager({id:'manager-0'}),/Invalid archive asset reference/);
});

test('both entry count and source-byte limits evict public assets',async()=>{
 for(const options of [{count:17},{count:4,padding:180*1024}]){
  const h=harness(options);for(let i=0;i<options.count;i++)await h.client.manager({id:`manager-${i}`});
  assert.equal(assetCalls(h),options.count);await h.client.manager({id:'manager-0'});assert.equal(assetCalls(h),options.count+1,'Oldest asset must be fetched and verified again after eviction');
 }
});
