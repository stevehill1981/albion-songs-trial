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
for(const name of ['blocks','fact'])assert.equal(await readFile(`build/admin/${name}.mjs`,'utf8'),await readFile(`src/lib/${name}.mjs`,'utf8'));
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
