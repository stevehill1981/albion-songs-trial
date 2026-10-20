import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDraft,blockEntries,editableFields} from '../src/editor/visual/state.mjs';
import {readAuthMessage} from '../src/editor/visual/auth.mjs';
import {validateComponentPage} from '../src/lib/component-preview.mjs';
const source=JSON.parse(readFileSync(new URL('../content/pages/manager-darren-moore.json',import.meta.url)));
test('draft edit groups undo losslessly and preserve sources and calculated manager selection',()=>{
 const original=structuredClone(source),draft=createDraft(source);
 draft.set('blocks.0','heading','First');draft.set('blocks.0','heading','Second');draft.commit();
 draft.set('blocks.2','paragraphs.0.parts.0.text','A new draft paragraph.');draft.commit();
 assert.equal(draft.page.blocks[0].heading,'Second');assert.deepEqual(draft.page.blocks[2].sources,original.blocks[2].sources);
 assert.deepEqual(draft.page.blocks[1],original.blocks[1]);
 draft.undo();assert.deepEqual(draft.page.blocks[2],original.blocks[2]);draft.undo();assert.deepEqual(draft.page,original);assert.equal(draft.changed,false);
 draft.redo();assert.equal(draft.page.blocks[0].heading,'Second');draft.set('blocks.0','heading','Third');assert.equal(draft.canRedo,false);
 draft.reset();assert.deepEqual(draft.page,original);draft.undo();assert.equal(draft.page.blocks[0].heading,'Third');
 assert.deepEqual(source,original);const copy=draft.page;copy.blocks[0].heading='External mutation';assert.equal(draft.page.blocks[0].heading,'Third');
});
test('draft model rejects arbitrary fields, nested calculated data and unsupported choices',()=>{
 const draft=createDraft(source);
 for(const [path,field,value] of [['blocks.1','manager','someone'],['blocks.1','summary.wins','999'],['blocks.0','__proto__.polluted','yes'],['blocks.99','heading','x']])assert.throws(()=>draft.set(path,field,value));
 assert.deepEqual(draft.page,source);assert.equal(draft.canUndo,false);
 const linked={type:'text-panel',heading:'Links',paragraphs:[{parts:[{type:'link',text:'Source',url:'https://example.com'}]}]};assert(!editableFields(linked).some(field=>field.path.startsWith('paragraphs.')));
});
test('valid simple text edits use the actual Astro validation while incomplete drafts remain undoable',()=>{
 const draft=createDraft(source);draft.set('blocks.0','heading','');assert.throws(()=>validateComponentPage(draft.page));draft.undo();assert.doesNotThrow(()=>validateComponentPage(draft.page));
 const nested=structuredClone(source);nested.blocks.push({type:'section',heading:'Layout',anchor:'layout',background:'white',spacing:'standard',columns:[{blocks:[{...structuredClone(source.blocks[2]),anchor:'nested'}]}]});
 const state=createDraft(nested);const child=blockEntries(state.page).at(-1);assert.equal(child.parent,'blocks.6');state.set(child.path,'heading','New column heading');state.set('blocks.6','background','navy');assert.doesNotThrow(()=>validateComponentPage(state.page));assert.throws(()=>state.set('blocks.6','background','pink'));
});
test('GitHub popup accepts only exact source, origin, provider and bounded token',()=>{
 const popup={},origin='https://auth.example',token='a'.repeat(30),data='authorization:github:success:'+JSON.stringify({token,provider:'github'});
 assert.deepEqual(readAuthMessage({source:popup,origin,data},{popup,origin}),{token});
 for(const event of [{source:{},origin,data},{source:popup,origin:'https://other.example',data},{source:popup,origin,data:'authorization:github:success:{bad'},{source:popup,origin,data:'authorization:github:success:'+JSON.stringify({token,provider:'other'})}])assert.equal(readAuthMessage(event,{popup,origin}),null);
 assert.equal(readAuthMessage({source:popup,origin,data},{popup:null,origin}),null);
 assert.deepEqual(readAuthMessage({source:popup,origin,data:'authorizing:github'},{popup,origin}),{handshake:true});
});
