import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
const origin='https://albion-songs-auth.steve-e85.workers.dev';
const upstreamToken='unit_test_github_credential_only';
const temp=await mkdtemp(join(tmpdir(),'albion-mcp-runtime-'));let runtime,inspector,modern,allowed=true,exchanges=0;
try{
 // Miniflare's HTTP dispatcher rewrites Host to its loopback listener. Restore
 // the original URL host at the test boundary; the compiled production checks stay intact.
 const boundary=`import worker from './index.mjs';export default{fetch(request,env,ctx){const headers=new Headers(request.headers);if(headers.get('Host')?.startsWith('127.0.0.1'))headers.set('Host',new URL(request.url).host);return worker.fetch(new Request(request,{headers}),env,ctx)}};`;
 runtime=new Miniflare(convertV4MiniflareOptions({...process.env.ALBION_CPU_PROFILE?{inspectorPort:0}:{},modules:[{type:'ESModule',path:resolve('auth/build/test-boundary.mjs'),contents:boundary},{type:'ESModule',path:resolve('auth/build/index.mjs'),contents:await readFile('auth/build/index.mjs','utf8')}],compatibilityDate:'2026-10-19',compatibilityFlags:['nodejs_compat','global_fetch_strictly_public'],kvNamespaces:['OAUTH_KV'],defaultPersistRoot:temp,bindings:{GITHUB_CLIENT_ID:'unit_test_id',GITHUB_CLIENT_SECRET:'unit_test_secret',EDITOR_ORIGIN:'https://albion-songs-trial.steve-e85.workers.dev'},outboundService:async request=>{
  const url=new URL(request.url);
  if(url.origin==='https://albion-songs-trial.steve-e85.workers.dev'){
   assert.equal(request.headers.get('Authorization'),null,'GitHub credentials must not reach archive assets');
   assert(url.pathname==='/version.json'||url.pathname==='/data/museum-query/manifest.json'||/^\/data\/museum-query\/files\/[a-f0-9]{64}\.json$/.test(url.pathname));
   try{return new Response(await readFile('public'+url.pathname),{headers:{'Content-Type':'application/json'}});}catch{return new Response('',{status:404});}
  }
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
 const formSources=consent.headers.get('Content-Security-Policy').match(/(?:^|;)\s*form-action\s+([^;]+)/)[1].split(/\s+/);assert(!formSources.includes('*'));assert(formSources.includes(new URL(query.get('redirect_uri')).origin));
 const handle=html.match(/name="handle" value="([^"]+)"/)?.[1];assert(handle);let cookies=consent.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const form=new URLSearchParams({handle,decision:'approve'}).toString();
 const csrf=await send('/authorize',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/x-www-form-urlencoded',Cookie:cookies},body:form});assert.equal(csrf.status,403);assert.equal(exchanges,0);
 for(const suppliedOrigin of [null,'null']){const headers={'Content-Type':'application/x-www-form-urlencoded',Cookie:cookies};if(suppliedOrigin!==null)headers.Origin=suppliedOrigin;const rejected=await send('/authorize',{method:'POST',headers,body:form});assert.equal(rejected.status,403);assert.equal(exchanges,0);}
 const unbound=await send('/authorize',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:form});assert.equal(unbound.status,400,await unbound.clone().text());assert.equal(exchanges,0);
 const approved=await send('/authorize',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:cookies},body:form});assert.equal(approved.status,302,await approved.clone().text());
 cookies=approved.headers.getSetCookie().filter(c=>!c.includes('Max-Age=0')).map(c=>c.split(';')[0]).join('; ');
 const github=new URL(approved.headers.get('Location'));assert.equal(github.hostname,'github.com');assert(formSources.includes(github.origin));assert.equal(github.searchParams.get('code_challenge_method'),'S256');assert(github.searchParams.get('state').startsWith('mcp_'));
 const callback='/callback?'+new URLSearchParams({state:github.searchParams.get('state'),code:'unit_test_code'});
 const wrong=await send(callback);assert.equal(wrong.status,400);assert.equal(exchanges,0);
 const completed=await send(callback,{headers:{Cookie:cookies}});assert.equal(completed.status,302,await completed.clone().text());assert.equal(exchanges,1);
 const client=new URL(completed.headers.get('Location'));assert.equal(client.origin,'https://claude.ai');assert.equal(client.searchParams.get('state'),'unit_test_client_state');assert(!client.href.includes(upstreamToken));
 const code=client.searchParams.get('code');assert(code);
 const exchanged=await readJSON(await send('/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:registration.client_id,code,code_verifier:verifier,redirect_uri:'https://claude.ai/api/mcp/auth_callback',resource:origin+'/mcp'}).toString()}));
 assert(exchanged.access_token);assert.notEqual(exchanged.access_token,upstreamToken);
 const rpc=async(method,params,id=1,extra={})=>{
  const response=await send('/mcp',{method:'POST',headers:{Host:new URL(origin).host,Authorization:`Bearer ${exchanged.access_token}`,Accept:'application/json, text/event-stream','Content-Type':'application/json',...extra},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
  const text=await response.text();assert(response.ok,`MCP ${method}: HTTP ${response.status}: ${text}`);
  return response.headers.get('Content-Type')?.includes('text/event-stream')?JSON.parse(text.split('\n').find(line=>line.startsWith('data: ')).slice(6)):JSON.parse(text);
 };
 let command;
 if(process.env.ALBION_CPU_PROFILE){
  const endpoint=await runtime.getInspectorURL();endpoint.protocol='http:';endpoint.pathname='/json';
  const targets=await fetch(endpoint).then(r=>r.json());assert(targets.length>0);
  inspector=new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{inspector.onopen=resolve;inspector.onerror=reject;});
  let sequence=0;const pending=new Map();
  inspector.onmessage=event=>{const reply=JSON.parse(event.data),wait=pending.get(reply.id);if(wait){pending.delete(reply.id);reply.error?wait.reject(Error(JSON.stringify(reply.error))):wait.resolve(reply.result);}};
  command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});inspector.send(JSON.stringify({id,method,params}));});
  await command('Profiler.enable');await command('Profiler.setSamplingInterval',{interval:100});await command('Profiler.start');
 }
 const initialized=await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'Direct museum acceptance',version:'1'}});assert.equal(initialized.result.serverInfo.name,'Albion museum');
 const tools=await rpc('tools/list',{},2,{'MCP-Protocol-Version':'2025-03-26'});assert.equal(tools.result.tools.length,14);
 const guide=await rpc('tools/call',{name:'museum_guide',arguments:{}},3,{'MCP-Protocol-Version':'2025-03-26'});assert(!guide.result.isError,JSON.stringify(guide));assert(guide.result.structuredContent.instructions);
 allowed=false;
 const denied=await rpc('tools/call',{name:'museum_guide',arguments:{}},4,{'MCP-Protocol-Version':'2025-03-26'});assert.equal(denied.result.isError,true);allowed=true;
 const invalid=await rpc('tools/call',{name:'list_content',arguments:{kind:'data'}},5,{'MCP-Protocol-Version':'2025-03-26'});assert.equal(invalid.result.isError,true);
 const schema=await rpc('tools/call',{name:'read_block_schema',arguments:{type:'manager-performance'}},7,{'MCP-Protocol-Version':'2025-03-26'});assert(!schema.result.isError);assert(schema.result.structuredContent.block.fields.some(f=>f.name==='manager'));
 const badOrigin=await send('/mcp',{method:'POST',headers:{Origin:'https://attacker.example',Authorization:`Bearer ${exchanged.access_token}`,Accept:'application/json, text/event-stream','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:6,method:'tools/list',params:{}})});assert.equal(badOrigin.status,403);
 modern=new Client({name:'Direct modern transport acceptance',version:'1'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
 const modernTransport=new StreamableHTTPClientTransport(new URL(origin+'/mcp'),{authProvider:{token:async()=>exchanged.access_token},fetch:async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  return send(url.pathname+url.search,{method:request.method,headers:request.headers,...request.body?{body:await request.text()}:{}});
 }});
 await modern.connect(modernTransport);assert.equal(modernTransport.protocolVersion,'2026-07-28');
 assert.equal((await modern.listTools()).tools.length,14);
 const modernGuide=await modern.callTool({name:'museum_guide',arguments:{}});assert(!modernGuide.isError);assert.deepEqual(modernGuide.structuredContent,JSON.parse(modernGuide.content[0].text));
 const statistics=await modern.callTool({name:'match_statistics',arguments:{ledger:'competitive',tenure:'darren-moore-caretaker-2018'}});assert(!statistics.isError,JSON.stringify(statistics));assert.equal(statistics.structuredContent.summary.played,6);assert.equal(statistics.structuredContent.summary.W,3);
 const wartime=await modern.callTool({name:'search_matches',arguments:{ledger:'wartime',season:'1942-43'}});assert(!wartime.isError);assert.equal(wartime.structuredContent.summary.played,38);assert(wartime.structuredContent.matches.every(row=>row.ledger==='wartime'));
 allowed=false;const deniedResearch=await modern.callTool({name:'list_managers',arguments:{}});assert.equal(deniedResearch.isError,true);allowed=true;
 if(command){
  const workloads=process.env.ALBION_CPU_WORKLOAD==='research'?[{name:'museum_guide',arguments:{}},{name:'read_manager',arguments:{id:'darren-moore'}},{name:'match_statistics',arguments:{ledger:'competitive',tenure:'darren-moore-caretaker-2018'}},{name:'search_matches',arguments:{ledger:'wartime',season:'1942-43'}}]:[{name:'museum_guide',arguments:{}}];
  const repetitions=workloads.length===1?100:25;
  for(let i=0;i<repetitions;i++){
   await rpc('tools/list',{},100+i,{'MCP-Protocol-Version':'2025-03-26'});
   for(const workload of workloads){const response=await rpc('tools/call',workload,300+i,{'MCP-Protocol-Version':'2025-03-26'});assert(!response.result.isError,JSON.stringify(response));}
  }
  const {profile}=await command('Profiler.stop');await writeFile(process.env.ALBION_CPU_PROFILE,JSON.stringify(profile));
  console.log(`Captured workerd CPU profile: ${repetitions} authenticated discovery rounds with ${workloads.map(w=>w.name).join(', ')}.`);
 }
 const passthrough=await send('/mcp',{method:'POST',headers:{Authorization:`Bearer ${upstreamToken}`,'Content-Type':'application/json'},body:'{}'});assert.equal(passthrough.status,401);
 const replay=await send(callback,{headers:{Cookie:cookies}});assert.equal(replay.status,400);assert.equal(exchanges,1);
 const old=await send('/auth?provider=github');assert.equal(old.status,302);assert(new URL(old.headers.get('Location')).searchParams.get('state').match(/^[a-f0-9]{64}$/));
 console.log('PASS: compiled OAuth Worker completes consent, GitHub PKCE, token exchange and authenticated legacy and modern MCP discovery/guide calls and sourced research queries; rejects hostile Origin, revoked editor access, invalid tool input, forged consent, unbound/replayed callbacks and upstream token passthrough. Existing Decap sign-in remains available.');
}finally{inspector?.close();await modern?.close();await runtime?.dispose();await rm(temp,{recursive:true,force:true});}
