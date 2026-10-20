import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadTrialPages} from '../src/lib/sveltia-trial.mjs';
export async function verifySveltiaTrial(){
 const root='build/admin/sveltia';
 const config=JSON.parse(await readFile(root+'/config.json','utf8'));
 assert.deepEqual(config.backend,{name:'test-repo'});assert(['http:','https:'].includes(new URL(config.site_url).protocol));assert.equal(new Set(config.collections.map(c=>c.name)).size,config.collections.length);assert.equal(config.publish_mode,'simple');assert.equal(new URL(config.collections[0].preview_path.replace('{{slug}}','managers/darren-moore'),config.site_url+'/').pathname,'/sveltia-trial/managers/darren-moore');
 assert(!JSON.stringify(config).includes('albion-songs-auth'));assert(!JSON.stringify(config).includes('public_repo'));
 const report=JSON.parse(await readFile('.cloudflare/sveltia-build.json','utf8'));
 assert(report.assets.length>5,'Require actual emitted assets, not an empty report.');
 for(const file of report.assets){assert(!file.path.split('/').some(p=>p==='..'||!p));const bytes=await readFile(root+'/'+file.path);assert.equal(bytes.length,file.bytes,file.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);}
 const seed=JSON.parse(await readFile(root+'/seed/manifest.json','utf8'));
 const pages=await loadTrialPages();
 for(const {file,page,path} of pages){assert(seed.files.includes(file));assert.deepEqual(JSON.parse(await readFile(root+'/seed/'+file)),page);const html=await readFile('build/sveltia-trial/'+path+'.html','utf8');assert(html.includes('Trial breadcrumbs'));assert(html.includes('Copied')||html.includes('copied content'));assert(html.includes(page.blocks[0].heading.replaceAll('&','&amp;').split('\n')[0]));}
 for(const file of seed.files)assert(file.startsWith('content/sveltia-trial/')||file.startsWith('content/photographs/')||file.startsWith('content/collections/'));
 const entry=await readFile(root+'/editor.html','utf8');assert(entry.includes('cms-seed-url'));assert(entry.includes('/admin/sveltia/trial.js'));
 const assets=(await readdir(root)).filter(name=>name.endsWith('.js')||name.endsWith('.css'));assert(assets.length>0);
 const licenses=JSON.parse(await readFile(root+'/licenses.json','utf8'));assert(licenses.some(l=>l.name==='@sveltia/cms'&&l.identifier==='MIT'&&l.text),'Retain Sveltia licence text.');
 const normal=await readFile('build/admin/index.html','utf8');assert.equal(normal,await readFile('public/admin/index.html','utf8'));assert(!normal.includes('sveltia'));
 const version=JSON.parse(await readFile('build/version.json','utf8'));for(const file of pages){const html=await readFile('build/sveltia-trial/'+file.path+'.html','utf8');assert(html.includes(`<meta name="trial-revision" content="${version.revision}">`));}
 console.log(`PASS: isolated Sveltia config, ${pages.length} sourced nested Astro pages, browser seed, ${report.assets.length} exact assets and MIT notice; normal editor unchanged.`);
}
