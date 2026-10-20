// Run only after the named museum and its editor configuration are verified.
// Package the old bookmark address separately; never overwrite public build output.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root='.cloudflare/old-address/.cloudflare/output/v0';
const worker=root+'/workers/default';
await mkdir(worker+'/bundle',{recursive:true});
const site=JSON.parse(await readFile('site.json','utf8'));
if(site.origin!=='https://throstle-and-stripes.steve-e85.workers.dev')throw Error('Review the bookmark destination before changing the old address.');
const source=await readFile('legacy/address-redirect.mjs','utf8');
await writeFile(worker+'/bundle/index.mjs',source.replace("import site from '../site.json' with {type:'json'};",'const site='+JSON.stringify(site)+';'));
await writeFile(root+'/config.json',JSON.stringify({buildContext:{isPreview:false}}));
await writeFile(worker+'/worker.config.json',JSON.stringify({name:'albion-songs-trial',compatibilityDate:'2026-10-20',workersDev:true,observability:{enabled:true,redactQueryString:true,logs:{enabled:true,headSamplingRate:1},traces:{enabled:true,headSamplingRate:0.01}},manifest:{type:'complete',mainModule:'index.mjs',modules:{'index.mjs':{type:'esm'}}}}));
console.log('Prepared fixed-origin bookmark redirect in .cloudflare/old-address. Deploy there with cf deploy --prebuilt --no-provision only after cutover checks.');
