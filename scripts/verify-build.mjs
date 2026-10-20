import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {loadContent,publicPage} from '../src/lib/content.mjs';
const content=await loadContent();
const version=JSON.parse(await readFile('public/version.json','utf8'));
const norm=s=>s.replace(/\s+/g,' ').trim();
for(const page of content.pages){
 const actual=await readFile(`build/${page.slug}.html`,'utf8');
 assert.equal(norm(actual),norm(publicPage(content,page,version.revision)),`Built ${page.slug} differs from its validated content.`);
 assert(actual.includes(`<meta name="trial-revision" content="${version.revision}">`));
}
assert.equal(norm(await readFile('build/index.html','utf8')),norm(await readFile(content.pages.some(p=>p.slug==='home')?'build/home.html':'build/songs.html','utf8')));
const index=await readFile('build/pages.html','utf8');
for(const c of content.collections){
 const html=await readFile(`build/collections/${c.slug}.html`,'utf8');
 assert(index.includes(`/collections/${c.slug}`));
 for(const p of content.pages.filter(p=>p.collections.includes(c.slug)))assert(html.includes(`href="/${p.slug}"`));
}
for(const name of ['blocks','fact','layout-copy','image-paths','image-library','component-preview','live-preview','manager-performance'])assert.equal(await readFile(`build/admin/${name}.mjs`,'utf8'),await readFile(`src/lib/${name}.mjs`,'utf8'));
const config=JSON.parse(await readFile('build/admin/config.yml','utf8'));
assert(config.collections.find(c=>c.name==='pages').create);
assert(config.collections.find(c=>c.name==='pages').fields.find(f=>f.name==='blocks').types.some(t=>t.name==='section'));
assert(config.collections.every(c=>!JSON.stringify(c).includes('markdown')));
console.log(`PASS: all ${content.pages.length} pages, collection membership, root alias and shared preview renderers verified from build output.`);

if(content.pages.some(p=>p.slug==='home')){
 const {execFileSync}=await import('node:child_process');
 execFileSync(process.execPath,['scripts/check-results.mjs'],{stdio:'inherit'});
 execFileSync(process.execPath,['scripts/check-wartime-output.mjs'],{stdio:'inherit'});
 execFileSync('python3',['scripts/check-links.py'],{stdio:'inherit'});
 for(const template of content.templates){const html=await readFile(`build/templates/${template.slug}.html`,'utf8');assert(html.includes(`<meta name="trial-revision" content="${version.revision}">`));}
}

if(content.photoEntries){
 const gallery=await readFile('build/images.html','utf8');
 for(const p of content.photoEntries){
  assert(gallery.includes(`/images/${p.id}`));
  const record=await readFile(`build/images/${p.id}.html`,'utf8');
  assert(record.includes(`<meta name="trial-revision" content="${version.revision}">`));
  assert(record.includes(`width="${p.width}" height="${p.height}"`));
 }
 const photos=config.collections.find(c=>c.name==='photographs');assert(photos.create);assert.equal(photos.fields.find(f=>f.name==='file').widget,'museum-image');
 console.log(`PASS: ${content.photoEntries.length} credited images have gallery thumbnails, exact preview routes and automatic dimensions.`);
}

assert.equal(config.backend.name,'albion-github');
const previewScript=await readFile('build/admin/astro-preview.mjs','utf8');assert(previewScript.includes("fetch('/editor-preview'"));
const generated=JSON.parse(await readFile('src/generated/component-context.json','utf8'));assert.equal(generated.revision,version.revision);
console.log('PASS: native Astro trial content, editor modules and runtime context share this build revision.');

// Verify every generated lookup asset from the actual deploy output, including its source bytes.
{
 const {sha256,ARCHIVE_FILES}=await import('./build-match-index.mjs');
 const manifest=JSON.parse(await readFile('build/data/museum-query/manifest.json','utf8'));
 assert.equal(manifest.revision,version.revision);
 const asset=async ref=>{const raw=await readFile(`build/data/museum-query/${ref.path}`,'utf8');assert.equal(Buffer.byteLength(raw),ref.bytes);assert.equal(sha256(raw),ref.sha256);return JSON.parse(raw);};
 for(const [ledger,path]of Object.entries(ARCHIVE_FILES)){
  const source=await readFile(path,'utf8'),entry=manifest.ledgers[ledger];assert.equal(entry.sourceSha256,sha256(source));
  const catalog=await asset(entry);await asset(entry.coverage);
  for(const group of catalog.groups){const descriptor=await asset(group.descriptor);let count=0;const ids=new Set();for(const part of descriptor.parts){const payload=await asset(part);assert.equal(payload.ledger,ledger);assert.equal(payload.matches.length,part.count);for(const match of payload.matches){assert(!ids.has(match.id));ids.add(match.id);}count+=part.count;}assert.equal(count,group.count);}
  assert.equal(catalog.groups.find(g=>g.scope==='all').count,JSON.parse(source).matches.length);
 }
 console.log('PASS: built archive lookup assets have complete pagination, matching source digests and this publication revision.');
}

{
 const {loadManagerContent}=await import('../src/lib/manager-content.mjs');
 const {performance}=await loadManagerContent();
 assert.deepEqual(generated.managerPerformance,performance);
 assert.deepEqual(JSON.parse(await readFile('build/admin/preview-context.json','utf8')).managerPerformance,performance);
 const selectors=[];const walk=value=>{if(!value||typeof value!=='object')return;if(value.name==='manager'&&value.widget==='select')selectors.push(value);for(const child of Object.values(value))if(Array.isArray(child))child.forEach(walk);else if(child&&typeof child==='object')walk(child);};walk(config);
 assert(selectors.length>=2,'Pages and templates must both offer manager selection.');
 for(const field of selectors)assert.deepEqual(field.options.map(o=>o.value).sort(),Object.keys(performance.profiles).sort());
 for(const id of Object.keys(performance.profiles)){const html=await readFile(`build/manager-${id}.html`,'utf8');assert(html.includes(`data-archive-sha="${performance.sourceSha256}"`));assert(html.includes('Match boundaries and sources'));assert(html.includes('Recorded competitive matches only.'));}
 console.log('PASS: manager choices, public components and both preview contexts use the same calculated archive snapshot.');
}

const {verifyEditorBuild,verifyEditorNegativeControls}=await import('./verify-editor-build.mjs');
const editor=await verifyEditorBuild();
const rejected=await verifyEditorNegativeControls();
console.log(`PASS: source-built main editor has ${editor.assets} exact assets, licence notices and both image encoders; obsolete editor absent; ${rejected} negative controls rejected.`);
