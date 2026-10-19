import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForRevision } from '../scripts/served-revision.mjs';
test('verification waits for both metadata and the rendered page to match',async()=>{
  let reads=0;
  const fetcher=async url=>{
    if(url.endsWith('version.json')){reads++;return Response.json({revision:'new'});}
    return new Response(`<meta name="trial-revision" content="${reads<3?'old':'new'}">`);
  };
  await waitForRevision('https://example.com','new',{fetcher,sleep:async()=>{},attempts:3});
  assert.equal(reads,3);
});
test('a permanently stale page fails even when metadata reports the new revision',async()=>{
  const fetcher=async url=>url.endsWith('version.json')?Response.json({revision:'new'}):new Response('<meta name="trial-revision" content="old">');
  await assert.rejects(waitForRevision('https://example.com','new',{fetcher,sleep:async()=>{},attempts:2}),/does not match/);
});

test('a new page must be served too; a missing route cannot receive a successful preview',async()=>{
 const fetcher=async url=>url.endsWith('version.json')?Response.json({revision:'new'}):url.endsWith('/missing-page')?new Response('Missing',{status:404}):new Response('<meta name="trial-revision" content="new">');
 await assert.rejects(waitForRevision('https://example.com','new',{fetcher,sleep:async()=>{},attempts:1,routes:['/songs','/missing-page']}),/does not match/);
 await assert.rejects(waitForRevision('https://example.com','new',{routes:[]}),/At least one/);
});
