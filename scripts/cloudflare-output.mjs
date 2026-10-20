import { mkdir, cp, writeFile, rm, readFile, readdir } from 'node:fs/promises';

// Pinned cf 1.0.0-beta.14 prebuilt contract. No automatic framework setup,
// The Astro preview runtime is packaged separately from static public assets.
const auth = process.argv.includes('--auth');
const handler=process.env.ALBION_MCP_HANDLER||'lean';
if(auth&&handler!=='lean'&&!(handler==='baseline'&&process.argv.includes('--hosted-comparison')))throw Error('The baseline handler needs --hosted-comparison; normal deployments use lean.');
const root = auth ? 'auth/.cloudflare/output/v0' : '.cloudflare/output/v0';
await rm(root, {recursive:true, force:true});
const worker = `${root}/workers/default`;
await mkdir(worker, {recursive:true});
await writeFile(`${root}/config.json`, JSON.stringify({buildContext:{isPreview:false}}));
const config = {name:auth ? 'albion-songs-auth' : 'albion-songs-trial', compatibilityDate:'2026-10-19', workersDev:true, observability:{enabled:false}};
if (auth) {
  await mkdir(`${worker}/bundle`, {recursive:true});
  await import('./build-auth.mjs');
  await cp('auth/build/index.mjs', `${worker}/bundle/index.mjs`);
  config.compatibilityFlags=['nodejs_compat','global_fetch_strictly_public'];
  config.observability={enabled:true,redactQueryString:true,logs:{enabled:true,headSamplingRate:1},traces:{enabled:true,headSamplingRate:0.01}};
  const mcp=await readFile('auth/mcp-config.json','utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(mcp){if(!/^[a-f0-9]{32}$/.test(mcp.namespaceId))throw Error('Invalid museum OAuth KV namespace.');config.env={OAUTH_KV:{type:'kv',id:mcp.namespaceId}};}
  config.manifest = {type:'complete',mainModule:'index.mjs',modules:{'index.mjs':{type:'esm'}}};
} else {
  await cp('build', `${worker}/assets`, {recursive:true});
  const adapter=JSON.parse(await readFile('.astro-server/wrangler.json','utf8'));
  if(adapter.assets?.binding!=='ASSETS'||adapter.kv_namespaces?.length||adapter.images||adapter.r2_buckets?.length||adapter.durable_objects?.bindings?.length)throw Error('The free preview trial must not provision storage or image services.');
  const modules={};
  const collect=async directory=>{for(const entry of await readdir(`.astro-server/${directory}`,{withFileTypes:true})){const name=directory+entry.name;if(entry.isDirectory())await collect(name+'/');else if(/\.(?:mjs|js)$/.test(name)){modules[name]={type:'esm'};await cp(`.astro-server/${name}`,`${worker}/bundle/${name}`,{recursive:true});}}};
  await mkdir(`${worker}/bundle`,{recursive:true});await collect('');
  if(!modules[adapter.main])throw Error('The Astro adapter entrypoint is missing.');
  config.manifest={type:'complete',mainModule:adapter.main,modules};
  config.compatibilityFlags=adapter.compatibility_flags;
  config.env={ASSETS:{type:'assets'}};
  config.assets = {htmlHandling:'drop-trailing-slash',notFoundHandling:'none',runWorkerFirst:['/editor-preview']};
  config.observability={enabled:true,redactQueryString:true,logs:{enabled:true,headSamplingRate:1},traces:{enabled:true,headSamplingRate:1}};
}
await writeFile(`${worker}/worker.config.json`, JSON.stringify(config));
