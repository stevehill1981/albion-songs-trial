import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {derivePatternMetadata,assertPatternMetadata,checkPatternMetadata} from '../scripts/pattern-metadata.mjs';
import {assertNoLegacyTemplates} from '../scripts/check-runtime-templates.mjs';
import * as lightweight from '../src/lib/block-schema.mjs';
import * as compatible from '../src/lib/blocks.mjs';
import {renderParts} from '../src/lib/inline-parts.mjs';
const source=await readFile(new URL('../src/lib/museum-patterns.json',import.meta.url),'utf8');
const catalogue=JSON.parse(source);
const metadata=JSON.parse(await readFile(new URL('../src/lib/pattern-metadata.json',import.meta.url),'utf8'));
test('lightweight metadata retains every authoritative schema field, label, order and hero flag',()=>{
 assertPatternMetadata(source,metadata);
 assert.deepEqual(metadata.patterns,catalogue.map(({template,...fields})=>fields));
 assert(metadata.patterns.every(p=>!Object.hasOwn(p,'template')));
 for(const pattern of catalogue)assert.deepEqual(lightweight.blockTypes.find(p=>p.name===pattern.name),{name:pattern.name,label:pattern.label,fields:pattern.fields});
 for(const name of ['validatePage','validateBlock','validateCollection','validateIdentifier','validateURL','validateLink','pageFields','collectionFields','blockTypes','cmsField'])assert.equal(compatible[name],lightweight[name],`Compatibility export ${name} diverged`);
 assert.equal(compatible.renderParts,renderParts);assert.deepEqual(compatible.patternTypes,catalogue);
});
test('metadata checking rejects field/hero/name/order drift and binds HTML-only edits too',()=>{
 for(const mutate of [p=>p[0].label+=' changed',p=>p[0].fields.pop(),p=>p[0].hero=!p[0].hero,p=>p[0].name='changed',p=>p.reverse(),p=>p[0].template+='<!-- changed HTML -->']){
  const changed=structuredClone(catalogue);mutate(changed);assert.throws(()=>assertPatternMetadata(JSON.stringify(changed),metadata),/stale/);
 }
 for(const change of [m=>delete m.sourceSha256,m=>m.patterns.pop(),m=>m.patterns[0].template='unexpected HTML',m=>m.patterns[0].fields[0].optional=true]){
  const changed=structuredClone(metadata);change(changed);assert.throws(()=>assertPatternMetadata(source,changed),/stale/);
 }
 for(const value of [[],[catalogue[0],catalogue[0]],[{name:'empty',template:'',fields:[]}]])assert.throws(()=>derivePatternMetadata(JSON.stringify(value)),/incomplete/);
});
test('missing or malformed metadata fails closed without repairing or overwriting a good file',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'albion-pattern-metadata-'));
 try{
  const original=join(dir,'catalogue.json'),generated=join(dir,'metadata.json');await writeFile(original,source);
  await assert.rejects(checkPatternMetadata({catalogue:original,metadata:generated}),/ENOENT/);
  await writeFile(generated,'{broken');await assert.rejects(checkPatternMetadata({catalogue:original,metadata:generated}));assert.equal(await readFile(generated,'utf8'),'{broken');
  await writeFile(generated,JSON.stringify(metadata));await checkPatternMetadata({catalogue:original,metadata:generated});
  const changed=structuredClone(catalogue);changed[0].template+='<!-- drift -->';await writeFile(original,JSON.stringify(changed));await assert.rejects(checkPatternMetadata({catalogue:original,metadata:generated}),/stale/);assert.deepEqual(JSON.parse(await readFile(generated,'utf8')),metadata);
 }finally{await rm(dir,{recursive:true});}
});
test('emitted-module guard rejects legacy markup in raw, JSON and double-escaped forms',()=>{
 assertNoLegacyTemplates([{name:'lightweight.mjs',source:'export const allowed = true;'}],catalogue);
 const html=catalogue[0].template,escaped=JSON.stringify(html).slice(1,-1),doubleEscaped=JSON.stringify(escaped).slice(1,-1);
 for(const source of [html,escaped,doubleEscaped])assert.throws(()=>assertNoLegacyTemplates([{name:'leak.mjs',source}],catalogue),/leaked/);
 assert.throws(()=>assertNoLegacyTemplates([],catalogue),/No emitted/);
 assert.throws(()=>assertNoLegacyTemplates([{name:'empty.mjs',source:''}],catalogue),/empty/);
});
