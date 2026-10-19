import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../auth/worker.mjs';
const env={GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',EDITOR_ORIGIN:'https://editor.example.com'};
const start=()=>handle(new Request('https://auth.example.com/auth?provider=github'),env,undefined,()=>1000);

test('missing configuration, wrong origin and missing state fail closed',async()=>{
  assert.equal((await handle(new Request('https://auth.example.com/auth'),{})).status,503);
  assert.equal((await handle(new Request('https://auth.example.com/auth',{headers:{Origin:'https://other.example.com'}}),env)).status,403);
  assert.equal((await handle(new Request('https://auth.example.com/callback?code=abc&state=bad'),env)).status,400);
});
test('authorization uses PKCE, public repository scope and a secure state cookie',async()=>{
  const res=await start(); const url=new URL(res.headers.get('Location'));
  assert.equal(res.status,302);
  assert.equal(url.searchParams.get('scope'),'public_repo');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.match(res.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
});
test('wrong or expired callback state never attempts token exchange',async()=>{
  const res=await start(); const cookie=res.headers.get('Set-Cookie').split(';')[0];
  const state=new URL(res.headers.get('Location')).searchParams.get('state');
  const fetcher=()=>{throw Error('Must not fetch');};
  for (const [value,time] of [['wrong',1001],[state,602000]]) {
    const result=await handle(new Request(`https://auth.example.com/callback?code=abc&state=${value}`,{headers:{Cookie:cookie}}),env,fetcher,()=>time);
    assert.equal(result.status,400); assert.match(result.headers.get('Set-Cookie'),/Max-Age=0/);
  }
});
test('GitHub failure and missing push access never release a token',async()=>{
  const res=await start(); const cookie=res.headers.get('Set-Cookie').split(';')[0];
  const state=new URL(res.headers.get('Location')).searchParams.get('state');
  const request=()=>new Request(`https://auth.example.com/callback?code=abc&state=${state}`,{headers:{Cookie:cookie}});
  let result=await handle(request(),env,async()=>new Response('{}',{status:500}),()=>1001);
  assert.equal(result.status,502);
  const fetcher=async url=>Response.json(url.includes('access_token')?{access_token:'never-released'}:url.endsWith('/user')?{login:'user_a'}:{permissions:{}});
  result=await handle(request(),env,fetcher,()=>1001);
  assert.equal(result.status,403); assert.doesNotMatch(await result.text(),/never-released/);
});
test('successful sign-in releases the token only to the configured opener origin',async()=>{
  const res=await start(); const cookie=res.headers.get('Set-Cookie').split(';')[0];
  const state=new URL(res.headers.get('Location')).searchParams.get('state');
  const fetcher=async url=>Response.json(url.includes('access_token')?{access_token:'test-token'}:url.endsWith('/user')?{login:'user_a'}:{permissions:{push:true}});
  const result=await handle(new Request(`https://auth.example.com/callback?code=abc&state=${state}`,{headers:{Cookie:cookie}}),env,fetcher,()=>1001);
  assert.equal(result.status,200);
  const html=await result.text(); assert.match(html,/event\.source!==opener\|\|event\.origin!==target/); assert.doesNotMatch(html,/postMessage\([^)]*,\s*['"]\*['"]/);
  assert.equal(result.headers.get('Cache-Control'),'no-store');
});
