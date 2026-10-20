import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const origin='https://albion-songs-auth.steve-e85.workers.dev';
const upstreamToken='unit_test_github_credential_only';
const temp=await mkdtemp(join(tmpdir(),'albion-mcp-runtime-'));let runtime,allowed=true,exchanges=0;
try{
 runtime=new Miniflare(convertV4MiniflareOptions({scriptPath:resolve('auth/build/index.mjs'),modules:true,compatibilityDate:'2026-10-19',compatibilityFlags:['nodejs_compat','global_fetch_strictly_public'],kvNamespaces:['OAUTH_KV'],defaultPersistRoot:temp,bindings:{GITHUB_CLIENT_ID:'unit_test_id',GITHUB_CLIENT_SECRET:'unit_test_secret',EDITOR_ORIGIN:'https://albion-songs-trial.steve-e85.workers.dev'},outboundService:async request=>{
  if(request.url==='https://github.com/login/oauth/access_token'){exchanges++;const body=await request.json();assert.equal(body.redirect_uri,origin+'/callback');assert.equal(typeof body.code_verifier,'string');return Response.json({access_token:upstreamToken});}
  assert.equal(request.headers.get('Authorization'),`Bearer ${upstreamToken}`);
  if(request.url==='https://api.github.com/repos/stevehill1981/albion-songs-trial')return Response.json({permissions:{push:allowed}});
  if(request.url==='https://api.github.com/user')return Response.json({id:123,login:'user_a'});
  throw Error('Unexpected upstream request');
 }}));
 const send=(path,options={})=>runtime.dispatchFetch(origin+path,{redirect:'manual',...options});
 const readJSON=async response=>{const text=await response.text();assert(response.ok,`HTTP ${response.status}: ${text}`);return JSON.parse(text);};
 const unauthorised=await send('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(unauthorised.status,401);assert(unauthorised.headers.get('WWW-Authenticate').includes('oauth-protected-resource/mcp'));
 const metadata=await readJSON(await send('/.well-known/oauth-protected-resource/mcp'));assert.equal(metadata.resource,origin+'/mcp');
 const discovery=await readJSON(await send('/.well-known/oauth-authorization-server'));assert.equal(discovery.authorization_endpoint,origin+'/authorize');assert(discovery.code_challenge_methods_supported.includes('S256'));
 const registration=await readJSON(await send('/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'<script>not trusted</script>',redirect_uris:['https://claude.ai/api/mcp/auth_callback'],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'})}));
 const verifier='test_client_verifier_with_more_than_forty_three_characters_123';const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');
 const query=new URLSearchParams({client_id:registration.client_id,redirect_uri:'https://claude.ai/api/mcp/auth_callback',response_type:'code',scope:'museum:manage',state:'unit_test_client_state',code_challenge:challenge,code_challenge_method:'S256',resource:origin+'/mcp'});
 const consent=await send('/authorize?'+query);const html=await consent.text();assert.equal(consent.status,200,html);assert(!html.includes('<script>'));assert(html.includes('&#60;script&#62;'));assert.equal(consent.headers.get('X-Frame-Options'),'DENY');assert.equal(consent.headers.get('Referrer-Policy'),'same-origin');
 const handle=html.match(/name="handle" value="([^"]+)"/)?.[1];assert(handle);let cookies=consent.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const form=new URLSearchParams({handle,decision:'approve'}).toString();
 const csrf=await send('/authorize',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/x-www-form-urlencoded',Cookie:cookies},body:form});assert.equal(csrf.status,403);assert.equal(exchanges,0);
 for(const suppliedOrigin of [null,'null']){const headers={'Content-Type':'application/x-www-form-urlencoded',Cookie:cookies};if(suppliedOrigin!==null)headers.Origin=suppliedOrigin;const rejected=await send('/authorize',{method:'POST',headers,body:form});assert.equal(rejected.status,403);assert.equal(exchanges,0);}
 const unbound=await send('/authorize',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:form});assert.equal(unbound.status,400,await unbound.clone().text());assert.equal(exchanges,0);
 const approved=await send('/authorize',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:cookies},body:form});assert.equal(approved.status,302,await approved.clone().text());
 cookies=approved.headers.getSetCookie().filter(c=>!c.includes('Max-Age=0')).map(c=>c.split(';')[0]).join('; ');
 const github=new URL(approved.headers.get('Location'));assert.equal(github.hostname,'github.com');assert.equal(github.searchParams.get('code_challenge_method'),'S256');assert(github.searchParams.get('state').startsWith('mcp_'));
 const callback='/callback?'+new URLSearchParams({state:github.searchParams.get('state'),code:'unit_test_code'});
 const wrong=await send(callback);assert.equal(wrong.status,400);assert.equal(exchanges,0);
 const completed=await send(callback,{headers:{Cookie:cookies}});assert.equal(completed.status,302,await completed.clone().text());assert.equal(exchanges,1);
 const client=new URL(completed.headers.get('Location'));assert.equal(client.origin,'https://claude.ai');assert.equal(client.searchParams.get('state'),'unit_test_client_state');assert(!client.href.includes(upstreamToken));
 const code=client.searchParams.get('code');assert(code);
 const exchanged=await readJSON(await send('/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:registration.client_id,code,code_verifier:verifier,redirect_uri:'https://claude.ai/api/mcp/auth_callback',resource:origin+'/mcp'}).toString()}));
 assert(exchanged.access_token);assert.notEqual(exchanged.access_token,upstreamToken);
 const passthrough=await send('/mcp',{method:'POST',headers:{Authorization:`Bearer ${upstreamToken}`,'Content-Type':'application/json'},body:'{}'});assert.equal(passthrough.status,401);
 const replay=await send(callback,{headers:{Cookie:cookies}});assert.equal(replay.status,400);assert.equal(exchanges,1);
 const old=await send('/auth?provider=github');assert.equal(old.status,302);assert(new URL(old.headers.get('Location')).searchParams.get('state').match(/^[a-f0-9]{64}$/));
 console.log('PASS: compiled OAuth Worker completes browser-bound consent, GitHub PKCE and resource-specific token exchange; rejects forged consent, unbound/replayed callbacks and upstream token passthrough. Existing Decap sign-in remains available. MCP tool protocol is checked separately; authorised hosted transport acceptance remains required.');
}finally{await runtime?.dispose();await rm(temp,{recursive:true,force:true});}
