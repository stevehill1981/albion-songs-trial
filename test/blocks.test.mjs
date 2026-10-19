import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderDocument,renderPageContent,validatePage,blockTypes,cmsField,pageFields} from '../src/lib/blocks.mjs';
import {checkEditorialPaths} from '../scripts/check-editorial-diff.mjs';
const original=JSON.parse(readFileSync(new URL('./fixtures/songs-initial.json',import.meta.url),'utf8'));
const fact=JSON.parse(readFileSync(new URL('../plans/origins.json',import.meta.url),'utf8')).initialFact;
const shell=readFileSync(new URL('../legacy/shell.html',import.meta.url),'utf8');
const clone=()=>structuredClone(original);
test('the extracted baseline preserves every source text, markup and link; comparator catches losses',()=>{
 const dir=mkdtempSync(join(tmpdir(),'albion-parity-'));
 try{
  const path=join(dir,'songs.html');const html=renderDocument(shell,original,{fact,revision:'test'});
  writeFileSync(path,html);execFileSync('python3',['scripts/compare-songs.py',path]);
  writeFileSync(path,html.replace('Singing unverified.','Verified singing.'));
  assert.throws(()=>execFileSync('python3',['scripts/compare-songs.py',path],{stdio:'pipe'}));
 }finally{rmSync(dir,{recursive:true});}
});
test('each template permits an ordinary heading edit using the same preview/public renderer',()=>{
 for(const spec of blockTypes.filter(t=>original.blocks.some(b=>b.type===t.name))){const p=clone();const b=p.blocks.find(b=>b.type===spec.name);b.heading='A changed heading';const html=renderPageContent(p,{fact});assert(html.includes('A changed heading'));}
});
test('new pages, repeatable blocks, song categories and fact counts are driven by content',()=>{
 const p=clone();p.slug='new-history-page';p.collections=[];
 const book=p.blocks.find(b=>b.type==='songbook');book.songs=[{...book.songs[0],title:'A different song',category:'Another theme'}];
 const facts=p.blocks.find(b=>b.type==='facts');facts.facts.reverse();facts.facts.pop();
 const timeline=p.blocks.find(b=>b.type==='timeline');timeline.events=[timeline.events[1],timeline.events[0]];
 const story=structuredClone(p.blocks.find(b=>b.type==='story'));story.anchor='another-story';p.blocks.splice(2,0,story);
 const html=renderPageContent(p,{fact});assert(html.includes('<option>Another theme</option>'));assert(html.includes('1 songs and music selections'));assert(html.includes('Fact 1 of 5'));assert(html.includes('id="another-story"'));
 assert(html.indexOf('Adoption date unresolved')<html.indexOf('A Jamaican instrumental becomes'));
 const config=pageFields.map(cmsField);assert(config.find(f=>f.name==='blocks').types.some(t=>t.name==='section'));
});
test('unsafe links, unknown fields, malformed parts, duplicate anchors and route collisions fail',()=>{
 for(const sourceURL of ['javascript:alert(1)','https://name:secret@example.com','http://example.com']){const p=clone();p.blocks.find(b=>b.type==='songbook').songs[0].sourceURL=sourceURL;assert.throws(()=>validatePage(p));}
 for(const mutate of [p=>p.slug='admin',p=>p.blocks[1].anchor=p.blocks[2].anchor,p=>p.blocks[1].anchor='song-count',p=>p.blocks[1].anchor='shepherd-title',p=>p.blocks[1].unknown='oops',p=>p.blocks[1].paragraphs[0].parts=[{type:'link',text:'Missing source'}],p=>p.blocks.shift(),p=>p.blocks.find(b=>b.type==='songbook').songs=[]]){const p=clone();mutate(p);assert.throws(()=>validatePage(p));}
 const p=clone();p.blocks[1].deck='<script>alert(1)</script>';
 assert(renderPageContent(p,{fact}).includes('&lt;script&gt;'));assert(!renderPageContent(p,{fact}).includes('<script>alert'));
});
test('editorial path guard fails on code, traversal, unknown content and empty changes',()=>{
 checkEditorialPaths(['content/fact.json','content/pages/new-page.json','content/collections/local-history.json']);
 for(const paths of [[],['src/lib/blocks.mjs'],['content/pages/../../site.json'],['content/pages/new.json','scripts/publish.mjs'],['content/results.json']])assert.throws(()=>checkEditorialPaths(paths));
});
