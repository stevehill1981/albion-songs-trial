import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {documentRows} from '../src/editor/visual/document-canvas.mjs';
import {createDraft,atPath} from '../src/editor/visual/state.mjs';
import {validateComponentPage} from '../src/lib/component-preview.mjs';
import {EDITOR_PAGES} from '../src/lib/editor-pages.mjs';

test('document field edits use the same validated model and undo without changing sources, credits or calculated selections',async()=>{
 for(const id of EDITOR_PAGES){
  const source=JSON.parse(await readFile(new URL(`../content/pages/${id}.json`,import.meta.url),'utf8')),draft=createDraft(source);
  const rows=documentRows(source);assert(rows.length>=source.blocks.length);
  for(const row of rows)for(const field of row.fields){
   const before=draft.page;draft.set(row.path,field.path,field.value+' (document edit)');draft.commit();assert.doesNotThrow(()=>validateComponentPage(draft.page));
   const changed=draft.page;const keys=field.path.split('.'),key=keys.pop();const target=atPath(changed,row.path);(keys.length?atPath(target,keys.join('.')):target)[key]=field.value;
   assert.deepEqual(changed,before,'Writing one document field must preserve all other content.');draft.undo();assert.deepEqual(draft.page,before);
  }
 }
});
test('linked prose and credits remain structured and cannot become plain editable fields',()=>{
 const source={blocks:[{type:'text-panel',heading:'Evidence',paragraphs:[{parts:[{type:'text',text:'Read '},{type:'link',text:'the original',url:'https://example.com/source'}]}],sources:[{label:'Original record',url:'https://example.com/source'}]}]};
 const [row]=documentRows(source);assert.equal(row.fields.some(field=>field.path.startsWith('paragraphs')),false);assert.deepEqual(row.linkedParagraphs[0],source.blocks[0].paragraphs[0].parts);
 row.linkedParagraphs[0][1].url='https://example.com/changed';row.sources[0].label='Changed';assert.equal(source.blocks[0].paragraphs[0].parts[1].url,'https://example.com/source');assert.equal(source.blocks[0].sources[0].label,'Original record');
});
test('nested document fields address only the selected column child',async()=>{
 const source=JSON.parse(await readFile(new URL('../content/pages/component-preview-trial.json',import.meta.url),'utf8')),draft=createDraft(source),row=documentRows(source).find(row=>row.parent&&row.kind==='text-panel');assert(row);
 draft.set(row.path,'heading','A changed column heading');assert.equal(atPath(draft.page,row.path).heading,'A changed column heading');
 const restored=draft.page;atPath(restored,row.path).heading=atPath(source,row.path).heading;assert.deepEqual(restored,source);
 const results=documentRows(source).find(row=>row.manager);assert(results);assert.deepEqual(results.fields.map(field=>field.path),['heading']);
});
