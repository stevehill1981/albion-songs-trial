import {validateComponentPage} from '../../lib/component-preview.mjs';
// No credential or network transport lives in this model. The caller provides a
// bounded operation; a save acknowledges its captured document, never later text.
export function createWorkflow({draft,call,onState=()=>{},onLoad=()=>{},validateDocument=validateComponentPage}){
 let state={pageId:draft.page.slug,ready:false,busy:false,baseRevision:null,draftNumber:null,commit:null,checked:null,reviewed:null,uncertain:false,blocked:false,publicationRevision:null,published:false,message:'Connect GitHub to load the saved page.'},generation=0;
 const emit=()=>onState({...state,dirty:draft.changed,canSave:state.ready&&!state.busy&&!state.uncertain&&!state.blocked&&!state.publicationRevision&&draft.changed,canReview:!!state.checked?.canPublish&&!state.busy&&!draft.changed&&!state.uncertain,canPublish:!!state.checked?.canPublish&&state.reviewed===state.commit&&!draft.changed&&!state.busy&&!state.uncertain});
 async function run(message,operation){
  if(state.busy)return false;
  const version=generation;state.busy=true;state.message=message;emit();
  try{await operation(()=>version===generation);return true;}
  catch(error){if(version===generation){state.message=error.message||'The operation could not be checked. Keep your changes and try a read again.';if(error.code==='conflict')state.blocked=true;if(error.uncertain){state.uncertain=true;state.checked=null;state.reviewed=null;}}return false;}
  finally{if(version===generation){state.busy=false;emit();}}
 }
 return{
  get state(){return structuredClone(state);},
  changed(){state.reviewed=null;state.published=false;emit();},
  disconnect(){generation++;state={...state,ready:false,busy:false,checked:null,reviewed:null};emit();},
  async load(draftNumber,pageId=state.pageId){return run('Loading saved content…',async current=>{
   state.ready=false;state.checked=null;state.reviewed=null;emit();
   const value=await call(draftNumber?{action:'open',draftNumber,pageId}:{action:'read',pageId});if(!current())return;
   validateDocument(value.document);
   if(value.document.slug!==pageId)throw Error('The saved content belongs to another page. Choose the page again.');
   draft.load(value.document);state={...state,pageId,ready:true,baseRevision:value.baseRevision||value.revision,draftNumber:draftNumber||null,commit:draftNumber?value.commit:null,checked:draftNumber?value:null,reviewed:null,uncertain:false,blocked:draftNumber?value.state!=='open':false,publicationRevision:value.publicationRevision||null,published:false,message:draftNumber?'Saved draft opened. Check its full-page preview before publishing.':'Published page loaded. Make a change, then save a draft.'};onLoad();
  });},
  async save(){
   if(!state.ready||state.busy||state.uncertain||state.blocked||state.publicationRevision||!draft.changed)return false;
   try{validateDocument(draft.page);}catch{state.message='Complete the required fields before saving. Your edits remain here.';emit();return false;}
   const snapshot=draft.page,args={action:'save',pageId:state.pageId,document:snapshot,baseRevision:state.baseRevision,...(state.draftNumber?{draftNumber:state.draftNumber,expectedCommit:state.commit}:{})};
   return run('Saving draft…',async current=>{
    const value=await call(args);if(!current())return;
    draft.acknowledgeSaved(snapshot);state={...state,draftNumber:value.draftNumber,commit:value.commit,baseRevision:value.baseRevision,checked:null,reviewed:null,message:draft.changed?'Draft saved. Your newer changes still need saving.':'Draft saved. The full-page preview is building.'};
   });
  },
  async list(page=1){let result;await run('Finding saved drafts…',async current=>{const value=await call({action:'drafts',page,pageId:state.pageId});if(current()){result=value;state.message=value.drafts.length?'Choose a saved draft below.':'No saved drafts for this page on this list page.';}});return result;},
  async check(){
   if(!state.draftNumber||state.busy)return false;
   const number=state.draftNumber,commit=state.commit;
   return run('Checking the saved version…',async current=>{
    const value=await call({action:'status',draftNumber:number,pageId:state.pageId});if(!current()||state.draftNumber!==number)return;
    if(value.commit!==commit){state.checked=null;state.reviewed=null;state.blocked=true;state.message='This draft changed elsewhere. Reopen it before saving or publishing; your local edits are still here.';return;}
    if(value.publicationRevision){state.publicationRevision=value.publicationRevision;state.uncertain=false;state.message='Publication is queued. Checking the public page…';return;}
    state.checked=value;
    if(['failure','cancelled','error'].includes(value.validation)||value.deployment==='failure'){state.reviewed=null;state.message='The saved draft did not pass its checks. Keep editing, then save another version.';return;}
    if(value.state!=='open'){state.blocked=true;state.reviewed=null;state.message='This draft is closed. Open the published page to continue.';return;}
    if(!value.canPublish)state.reviewed=null;
    state.message=value.canPublish?(draft.changed?'Saved preview ready. Save your newer changes before publishing.':'Saved preview ready. Open it and check the page, then choose Publish this version.'):value.previewVerified?'The published site changed. Reopen the published page before preparing another draft.':'The saved preview is not ready yet. Check again shortly.';
    if(value.previewVerified&&!value.canPublish)state.blocked=true;
   });
  },
  review(){if(!state.checked?.canPublish||state.busy||draft.changed||state.uncertain)return null;state.reviewed=state.commit;state.message='Check the full-page preview in the new tab. Return here to publish this version.';emit();return state.checked.previewUrl;},
  async publish(){
   if(!state.checked?.canPublish||state.reviewed!==state.commit||draft.changed||state.busy||state.uncertain)return false;
   const args={action:'publish',pageId:state.pageId,draftNumber:state.draftNumber,expectedCommit:state.commit,baseRevision:state.baseRevision,confirmation:'Publish this previewed revision'};
   return run('Publishing the checked version…',async current=>{const value=await call(args);if(!current())return;state.publicationRevision=value.revision;state.reviewed=null;state.checked=null;state.message='Publishing… waiting for the public page to update.';});
  },
  async publication(){
   if(!state.publicationRevision||state.busy)return false;
   const revision=state.publicationRevision;
   return run('Checking publication…',async current=>{
    const value=await call({action:'publication',revision});if(!current())return;
    if(value.state==='live'){state.baseRevision=revision;state.publicationRevision=null;state.draftNumber=null;state.commit=null;state.checked=null;state.reviewed=null;state.uncertain=false;state.blocked=false;state.published=true;state.message=draft.changed?'Published. Your newer local changes still need saving.':'Published. The public page now shows this version.';}
    else state.message=value.state==='failed'?'Publication failed. The previous public page remains available. Check again after the build is repaired.':'Publishing… the public page has not updated yet.';
   });
  }
 };
}
