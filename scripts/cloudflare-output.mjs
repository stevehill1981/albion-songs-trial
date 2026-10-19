import { mkdir, cp, writeFile, rm } from 'node:fs/promises';

// Pinned cf 1.0.0-beta.14 prebuilt contract. No automatic framework setup,
// Worker runtime or storage is introduced into the static public site.
const auth = process.argv.includes('--auth');
const root = auth ? 'auth/.cloudflare/output/v0' : '.cloudflare/output/v0';
await rm(root, {recursive:true, force:true});
const worker = `${root}/workers/default`;
await mkdir(worker, {recursive:true});
await writeFile(`${root}/config.json`, JSON.stringify({buildContext:{isPreview:false}}));
const config = {name:auth ? 'albion-songs-auth' : 'albion-songs-trial', compatibilityDate:'2026-10-19', workersDev:true, observability:{enabled:false}};
if (auth) {
  await mkdir(`${worker}/bundle`, {recursive:true});
  await cp('auth/worker.mjs', `${worker}/bundle/index.mjs`);
  config.manifest = {type:'complete',mainModule:'index.mjs',modules:{'index.mjs':{type:'esm'}}};
} else {
  await cp('build', `${worker}/assets`, {recursive:true});
  config.assets = {htmlHandling:'drop-trailing-slash',notFoundHandling:'none'};
}
await writeFile(`${worker}/worker.config.json`, JSON.stringify(config));
