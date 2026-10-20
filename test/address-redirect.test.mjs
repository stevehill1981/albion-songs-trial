import test from 'node:test';
import assert from 'node:assert/strict';
import redirect from '../legacy/address-redirect.mjs';
import site from '../site.json' with {type:'json'};
test('old bookmarks retain paths and filters on the fixed museum origin',()=>{
 for(const path of ['/','/admin/','/wartime?season=1942-43','//evil.invalid/a?redirect=https://evil.invalid','/songs.html']){
  const result=redirect.fetch(new Request('https://albion-songs-trial.steve-e85.workers.dev'+path));
  assert.equal(result.status,308);
  const destination=new URL(result.headers.get('Location')),incoming=new URL('https://albion-songs-trial.steve-e85.workers.dev'+path);
  assert.equal(destination.origin,site.origin);assert.equal(destination.pathname,incoming.pathname);assert.equal(destination.search,incoming.search);
 }
});
test('old writes cannot forward credentials, request bodies or redirects',()=>{
 for(const method of ['POST','PUT','DELETE','OPTIONS']){
  const result=redirect.fetch(new Request('https://albion-songs-trial.steve-e85.workers.dev/editor-preview',{method,headers:{Authorization:'Bearer unit-test-only'},...(method==='POST'?{body:'private draft'}:{})}));
  assert.equal(result.status,410);assert.equal(result.headers.get('Location'),null);assert.equal(result.headers.get('Cache-Control'),'no-store');
 }
});
