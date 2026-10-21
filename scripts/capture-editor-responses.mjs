// Eight credential-free reads. Never capture tokens, request headers or writes.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {boundedText,REPOSITORY} from '../auth/mcp/github.mjs';
assert(process.argv[2],'Supply the external evidence JSON path');
const base=`https://api.github.com/repos/${REPOSITORY}`,sources={};
async function get(name,path){
 const response=await fetch(base+path,{headers:{Accept:'application/vnd.github+json','User-Agent':'Albion local response diagnostic'},redirect:'manual',signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,200,`Public capture failed for ${name}`);
 const text=await boundedText(response,2*1024*1024);sources[name]={url:base+path,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')};return JSON.parse(text);
}
const repository=await get('repository','');assert.equal(repository.private,false);assert.equal(repository.full_name,REPOSITORY);
const ref=await get('ref','/git/ref/heads/main'),revision=ref.object?.sha;assert(/^[a-f0-9]{40}$/.test(revision));
const [record,collections,photographs,managers,commit,pullRequest]=await Promise.all([
 get('record',`/contents/content/pages/component-preview-trial.json?ref=${revision}`),
 get('collections',`/contents/content/collections?ref=${revision}`),
 get('photographs',`/contents/content/photographs?ref=${revision}`),
 get('managers',`/contents/content/managers?ref=${revision}`),
 get('commit',`/git/commits/${revision}`),get('pullRequest','/pulls/59')
]);
const output=resolve(process.argv[2]);await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({schemaVersion:1,repository:REPOSITORY,revision,capturedAt:new Date().toISOString(),sources,bodies:{repository,ref,record,collections,photographs,managers,commit,pullRequest}},null,2)+'\n');
console.log(JSON.stringify({revision,publicGetRequests:8,payloadBytes:Object.fromEntries(Object.entries(sources).map(([name,row])=>[name,row.bytes]))}));
