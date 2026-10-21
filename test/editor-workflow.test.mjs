import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDraft} from '../src/editor/visual/state.mjs';
import {createWorkflow} from '../src/editor/visual/workflow.mjs';
const page=JSON.parse(await readFile(new URL('../content/pages/component-preview-trial.json',import.meta.url),'utf8'));
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
function harness(){
 const draft=createDraft(page),calls=[];let pending=null,live=false,head=B,uncertain=false,last;
 const call=async input=>{calls.push(structuredClone(input));if(input.action==='read')return{document:page,revision:A};if(input.action==='open')return{document:page,baseRevision:A,commit:head,state:'open'};if(input.action==='save'){if(uncertain)throw Object.assign(Error('Reopen saved drafts to check.'),{uncertain:true});return new Promise(resolve=>{pending=resolve;});}if(input.action==='status')return{commit:head,state:'open',canPublish:true,previewUrl:'https://checked.example/practice'};if(input.action==='publish')return{revision:C};if(input.action==='publication')return{state:live?'live':'publishing'};};
 const workflow=createWorkflow({draft,call,onState:s=>last=s});
 return{draft,workflow,calls,get last(){return last;},save(){pending({draftNumber:17,commit:B,baseRevision:A});},set(values){({live=live,head=head,uncertain=uncertain}=values);},edit(text){draft.set('blocks.0','heading',text);workflow.changed();}};
}
test('saving acknowledges the captured document while newer typing remains dirty; duplicate clicks cannot write twice',async()=>{
 const h=harness();await h.workflow.load();h.edit('First draft');const saving=h.workflow.save();assert.equal(await h.workflow.save(),false);h.edit('Still typing');h.save();await saving;
 assert.equal(h.calls.filter(c=>c.action==='save').length,1);assert.equal(h.calls.find(c=>c.action==='save').document.blocks[0].heading,'First draft');assert.equal(h.draft.page.blocks[0].heading,'Still typing');assert(h.draft.changed);assert.equal(h.last.canReview,false);assert.match(h.last.message,/newer changes/);
 h.draft.reset();assert.equal(h.draft.page.blocks[0].heading,'First draft');assert(!h.draft.changed);assert.deepEqual(h.draft.page.blocks[2].sources,page.blocks[2].sources);
});
test('a new edit invalidates preview approval; merging is distinct from verified publication',async()=>{
 const h=harness();await h.workflow.load();h.edit('A checked draft');const save=h.workflow.save();h.save();await save;await h.workflow.check();assert(h.last.canReview);assert.equal(await h.workflow.publish(),false);h.workflow.review();assert(h.last.canPublish);
 h.edit('Another edit');assert(!h.last.canPublish);assert.equal(await h.workflow.publish(),false);h.draft.reset();h.workflow.changed();assert(!h.last.canPublish);h.workflow.review();await h.workflow.publish();assert.equal(h.last.published,false);assert.equal(h.last.canSave,false);
 h.edit('Next draft while publishing');await h.workflow.publication();assert.equal(h.last.published,false);h.set({live:true});await h.workflow.publication();assert.equal(h.last.published,true);assert(h.draft.changed);assert.equal(h.workflow.state.baseRevision,C);assert.equal(h.workflow.state.draftNumber,null);assert(h.last.canSave);
});
test('uncertain writes block repeat saves and changed drafts block overwrites until reopened',async()=>{
 const h=harness();await h.workflow.load();h.edit('Unsure');h.set({uncertain:true});await h.workflow.save();assert(h.last.uncertain);assert.equal(await h.workflow.save(),false);assert.equal(h.calls.filter(c=>c.action==='save').length,1);
 await h.workflow.load(17);assert(!h.draft.changed);assert(!h.draft.canUndo);h.set({head:C});await h.workflow.check();assert(h.workflow.state.blocked);assert.equal(h.workflow.review(),null);assert.match(h.last.message,/changed elsewhere/);
});
test('disconnect ignores delayed reads and incomplete input never reaches saving',async()=>{
 const draft=createDraft(page);let resolve;const workflow=createWorkflow({draft,call:()=>new Promise(r=>resolve=r)});const loading=workflow.load();workflow.disconnect();resolve({document:page,revision:A});await loading;assert.equal(workflow.state.ready,false);
 const h=harness();await h.workflow.load();h.edit('');assert.equal(await h.workflow.save(),false);assert.equal(h.calls.filter(c=>c.action==='save').length,0);assert(h.draft.changed);
});

test('switching pages clears review and undo; failed switches cannot save or publish the previous page',async()=>{
 const other={...structuredClone(page),slug:'managers',title:'Managers'};
 const draft=createDraft(page),calls=[];let fail=false;
 const workflow=createWorkflow({draft,call:async input=>{calls.push(input);if(fail)throw Error('Read unavailable');if(input.action==='read')return {document:input.pageId==='managers'?other:page,revision:A};if(input.action==='drafts')return{drafts:[]};}});
 await workflow.load();draft.set('blocks.0','heading','Old unsaved words');workflow.changed();
 await workflow.load(undefined,'managers');assert.equal(draft.page.slug,'managers');assert.equal(draft.canUndo,false);assert.equal(workflow.state.checked,null);assert.equal(workflow.state.reviewed,null);
 await workflow.list();assert.equal(calls.at(-1).pageId,'managers');
 fail=true;assert.equal(await workflow.load(undefined,page.slug),false);assert.equal(workflow.state.ready,false);assert.equal(await workflow.save(),false);assert.equal(await workflow.publish(),false);assert.equal(draft.page.slug,'managers');
 fail=false;await workflow.load(undefined,page.slug);assert.equal(workflow.state.ready,true);assert.equal(draft.page.slug,page.slug);
});
test('a load returning the wrong page never enables editing',async()=>{
 const draft=createDraft(page),workflow=createWorkflow({draft,call:async()=>({document:page,revision:A})});
 assert.equal(await workflow.load(undefined,'managers'),false);assert.equal(workflow.state.ready,false);
});
