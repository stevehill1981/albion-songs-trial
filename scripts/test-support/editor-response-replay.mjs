import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REPOSITORY} from '../../auth/mcp/github.mjs';
import {fixture,MAIN,HEAD} from './editor-harness.mjs';

export function validateReplay(capture){
 assert.equal(capture.schemaVersion,1);assert.equal(capture.repository,REPOSITORY);assert(/^[a-f0-9]{40}$/.test(capture.revision));
 const data=capture.bodies;assert(data);assert.equal(data.repository?.private,false);assert.equal(data.repository?.full_name,REPOSITORY);
 assert.equal(data.ref?.object?.sha,capture.revision);assert.equal(data.commit?.sha,capture.revision);
 for(const kind of ['collections','photographs','managers'])assert(Array.isArray(data[kind])&&data[kind].length<=500);
 assert.equal(data.record?.encoding,'base64');assert(typeof data.record.content==='string'&&/^[A-Za-z0-9+/=\s]+$/.test(data.record.content));
 const bytes=Buffer.from(data.record.content,'base64');assert.equal(bytes.length,data.record.size);assert(bytes.length<=256*1024);
 assert.deepEqual(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),fixture,'Replay must retain the exact published practice content');
 assert(Number.isSafeInteger(data.pullRequest?.number)&&data.pullRequest.number>0);
 return data;
}
export async function readReplay(path){const raw=await readFile(path);assert(raw.length<=2*1024*1024);const capture=JSON.parse(raw);validateReplay(capture);return{capture,digest:createHash('sha256').update(raw).digest('hex')};}

export function responseDelivery(bytes,delivery,onChunk=()=>{}){
 assert(bytes instanceof Uint8Array&&bytes.length>0&&bytes.length<=512*1024);assert(['single','chunked'].includes(delivery));
 if(delivery==='single'){onChunk(bytes.length);return new Response(bytes,{headers:{'Content-Type':'application/json'}});}
 let offset=0;
 return new Response(new ReadableStream({async pull(controller){
  if(offset===bytes.length){controller.close();return;}
  await new Promise(resolve=>setTimeout(resolve,1));const end=Math.min(offset+1024,bytes.length),chunk=bytes.slice(offset,end);offset=end;onChunk(chunk.length);controller.enqueue(chunk);
 }}),{headers:{'Content-Type':'application/json'}});
}
export function replayFetcher(fetcher,capture,delivery){
 const data=validateReplay(capture),stats=[];
 const replay=async(url,init={})=>{
  // The original harness still validates each credential, URL, method and body.
  const stub=await fetcher(url,init);assert.equal(stub.status,200);const expected=await stub.json();
  const path=new URL(url).pathname.replace(`/repos/${REPOSITORY}`,''),method=init.method||'GET',input=init.body&&JSON.parse(init.body);let model;
  if(path===''&&method==='GET')model={...data.repository,permissions:expected.permissions};
  else if(path==='/git/ref/heads/main'&&method==='GET')model={...data.ref,object:{...data.ref.object,sha:expected.object.sha}};
  else if(path==='/contents/content/pages/component-preview-trial.json'&&method==='GET')model={...data.record,sha:expected.sha};
  else if(['/contents/content/collections','/contents/content/photographs','/contents/content/managers'].includes(path)&&method==='GET')model=data[path.split('/').at(-1)];
  else if(path==='/git/refs'&&method==='POST'){assert.equal(input.sha,MAIN);model={...data.ref,ref:input.ref,object:{...data.ref.object,sha:MAIN}};}
  else if(path==='/contents/content/pages/component-preview-trial.json'&&method==='PUT'){
   // The documented write response returns file metadata, without the GET's
   // base64 content or encoding fields. Including them overstates save payloads.
   const {content,encoding,...metadata}=data.record;
   model={content:{...metadata,sha:HEAD,size:Buffer.from(input.content,'base64').length},commit:{...data.commit,sha:expected.commit.sha}};
  }
  else if(path==='/pulls'&&method==='POST')model={...data.pullRequest,number:expected.number,html_url:expected.html_url,state:'open',closed_at:null,merged_at:null,head:{...data.pullRequest.head,sha:HEAD,ref:input.head},base:{...data.pullRequest.base,ref:'main'}};
  else assert.fail('Unsupported replay response');
  const bytes=new TextEncoder().encode(JSON.stringify(model));const row={path,method,bytes:bytes.length,emittedChunks:0};stats.push(row);
  return responseDelivery(bytes,delivery,()=>row.emittedChunks++);
 };
 return {fetcher:replay,stats};
}
