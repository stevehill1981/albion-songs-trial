// Owner-run, cf-only setup. No credentials are read or written by this script.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const run=(command,args,options={})=>execFileSync(command,args,{encoding:'utf8',maxBuffer:4*1024*1024,...options});
const git=args=>run('git',['-c','core.fsmonitor=false',...args]).trim();
if(git(['branch','--show-current'])!=='main')throw Error('Run setup from the checked main branch after the connector PR has merged.');
const changed=run('git',['-c','core.fsmonitor=false','status','--porcelain']).trimEnd().split('\n').filter(Boolean);
if(changed.some(line=>line.slice(3)!=='auth/mcp-config.json'))throw Error('Save unrelated workspace changes before running museum setup.');
const revision=git(['rev-parse','HEAD']);
const accountId=run('gh',['variable','get','CLOUDFLARE_ACCOUNT_ID']).trim();
if(!/^[a-f0-9]{32}$/.test(accountId))throw Error('The repository’s configured Cloudflare account is unavailable.');
const env={...process.env,CLOUDFLARE_ACCOUNT_ID:accountId};
const cf=(args,options={})=>run('npx',['--yes','--package=cf@1.0.0-beta.14','cf',...args],{env,...options});
const identity=JSON.parse(cf(['auth','whoami']));
if(!identity.authenticated)throw Error('Sign into cf in your terminal first: mise exec node@24.9.0 -- cf auth login. Do not paste credentials into chat.');
let config=await readFile('auth/mcp-config.json','utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(config&&(!/^[a-f0-9]{32}$/.test(config.namespaceId)||config.accountId!==accountId))throw Error('The saved MCP namespace does not match this repository’s Cloudflare account.');
if(!config){
 const matches=[];
 for(let page=1;page<=100;page++){
  const rows=JSON.parse(cf(['kv','namespaces','list','--page',String(page),'--per-page','100']));
  if(!Array.isArray(rows))throw Error('Could not enumerate KV namespaces; nothing has been created.');
  matches.push(...rows.filter(row=>row.title==='albion-museum-oauth'));
  if(rows.length<100)break;
  if(page===100)throw Error('Namespace listing exceeded its bound; nothing has been created.');
 }
 if(matches.length>1)throw Error('More than one matching namespace exists; choose the intended resource before continuing.');
 // Classic Workers KV is available on Free. Do not use KV Instant or upgrade a plan.
 const namespace=matches[0]||JSON.parse(cf(['kv','namespaces','create','--title','albion-museum-oauth']));
 if(!/^[a-f0-9]{32}$/.test(namespace.id))throw Error('KV creation was not confirmed. Check the account for albion-museum-oauth before retrying.');
 config={accountId,namespaceId:namespace.id};await writeFile('auth/mcp-config.json',JSON.stringify(config,null,2)+'\n');
 console.log('Saved the OAuth namespace reference in auth/mcp-config.json. Retain this file if a later step fails.');
}
run(process.execPath,['scripts/cloudflare-output.mjs','--auth'],{stdio:'inherit',env:{...process.env,GITHUB_SHA:revision}});
run(process.execPath,['scripts/check-mcp-runtime.mjs'],{stdio:'inherit'});
cf(['deploy','--prebuilt','--dry-run','--no-provision'],{cwd:'auth'});
cf(['deploy','--prebuilt','--no-provision','--tag',revision.slice(0,8),'--message',revision],{cwd:'auth'});
// The prebuilt auth output is below auth/, so run cf there, not at the public site root.

const origin='https://albion-songs-auth.steve-e85.workers.dev';
let ready=false;
for(let attempt=0;attempt<6;attempt++){
 try{
  const options={redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)};
  const [health,metadata,protectedRoute,editorHealth,editorLogin]=await Promise.all([
   fetch(origin+'/mcp-health',options),fetch(origin+'/.well-known/oauth-protected-resource/mcp',options),
   fetch(origin+'/mcp',{...options,method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),
   fetch(origin+'/health',options),fetch(origin+'/auth?provider=github',options)
  ]);
  if(health.ok&&metadata.ok&&protectedRoute.status===401&&editorHealth.ok&&editorLogin.status===302){
   const h=await health.json(),m=await metadata.json(),e=await editorHealth.json();
   if(h.configured&&h.handler==='lean'&&h.revision===revision&&m.resource===origin+'/mcp'&&e.configured&&new URL(editorLogin.headers.get('Location')).hostname==='github.com'){ready=true;break;}
  }
 }catch{/* Bounded propagation retry; no credentials or response bodies are logged. */}
 if(attempt<5)await new Promise(resolve=>setTimeout(resolve,1000));
}
if(!ready)throw Error('Deployment is not verified. Keep auth/mcp-config.json and check the existing editor sign-in before retrying.');
console.log(`Verified lean museum MCP discovery, unauthenticated rejection, retained editor sign-in and deployed revision ${revision}.`);
console.log(`Add this custom connector in Claude: ${origin}/mcp`);
console.log('Hosted owner-account connection, tool use, preview and publication still need testing. Commit the namespace reference through the normal checked PR process.');
