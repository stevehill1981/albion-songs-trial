import {createDraft,blockEntries,editableFields,atPath} from './state.mjs';
import {createInlineOverlay} from './inline-overlay.mjs';
import {createWorkflow} from './workflow.mjs';
import {readAuthMessage} from './auth.mjs';
import {createLivePreview} from '../../lib/live-preview.mjs';
import {validateComponentPage} from '../../lib/component-preview.mjs';
const data=JSON.parse(document.querySelector('#visual-data').textContent);
const draft=createDraft(data.page),frame=document.querySelector('#canvas');
const status=document.querySelector('#preview-status'),form=document.querySelector('#fields');
let selected='blocks.0',token='',popup=null,authTimer=null,inline=null,pendingHtml=null;
const $=id=>document.getElementById(id);
let workflowState=null,pollTimer=null,pollCount=0,listPage=1,operationController=null;
const workflow=data.workflow?createWorkflow({draft,call:editorCall,onState:renderWorkflow,onLoad:()=>{selected='blocks.0';pendingHtml=null;outline();select(selected);live.update(draft.page);}}):null;
const label=block=>block.heading||({'intro':'Page introduction','section':'Section','photograph':'Photograph','text-panel':'Text and sources','manager-performance':'Recorded performance'}[block.type]);
function buttons(){
 $('undo').disabled=!draft.canUndo||!!workflow&&!workflowState?.ready;$('redo').disabled=!draft.canRedo||!!workflow&&!workflowState?.ready;$('reset').disabled=!!workflow&&!workflowState?.ready;
 if(workflow){$('draft-status').textContent=!workflowState?.ready?'Connect GitHub to load the saved page':draft.changed?'Unsaved changes':workflowState.draftNumber?'Saved draft':'Published version';return;}
 $('draft-status').textContent=draft.changed?'Practice changes only · not saved to the museum':'Original practice copy';
}
function select(path,{focus=false}={}){
 if(inline)finishInline();selected=path;
 const block=atPath(draft.page,path);$('selected-title').textContent=label(block);
 $('field-help').textContent=block.type==='manager-performance'?'Results are calculated from the archive. You can edit the heading; the figures stay protected.':'Edit these fields, or choose Type on page for simple text.';
 form.replaceChildren();
 for(const field of editableFields(block)){
  const wrap=document.createElement('div'),labelEl=document.createElement('label');
  labelEl.textContent=field.label;const control=document.createElement(field.choices||field.reference?'select':'textarea');
  control.id='field-'+field.path.replaceAll('.','-');labelEl.htmlFor=control.id;
  if(control.tagName==='SELECT')for(const item of field.reference?data.photographs:field.choices.map(value=>({id:value,caption:value}))){const option=document.createElement('option');option.value=item.id;option.textContent=item.caption+(item.author?' · '+item.author:'');control.append(option);}
  control.value=atPath(block,field.path);control.addEventListener('input',()=>{draft.set(path,field.path,control.value);changed();});control.addEventListener('change',()=>draft.commit());control.addEventListener('blur',()=>draft.commit());
  wrap.append(labelEl,control);
  if(field.inline){const button=document.createElement('button');button.type='button';button.textContent='Type on page';button.addEventListener('click',()=>beginInline(path,field));wrap.append(button);}
  form.append(wrap);
 }
 for(const button of $('outline').querySelectorAll('button'))button.setAttribute('aria-current',String(button.dataset.path===path));
 markSelection();if(focus)$('block-fields').focus();
}
function outline(){
 const current=draft.page;$('outline').replaceChildren();
 for(const row of blockEntries(current)){
  const button=document.createElement('button');button.type='button';button.dataset.path=row.path;if(row.parent)button.dataset.child='';button.textContent=label(row.block);button.setAttribute('aria-current',String(row.path===selected));button.addEventListener('click',()=>{select(row.path);scrollToBlock(row.path);});$('outline').append(button);
 }
}
function refreshLabels(){
 const page=draft.page;
 for(const button of $('outline').querySelectorAll('button'))button.textContent=label(atPath(page,button.dataset.path));
 $('selected-title').textContent=label(atPath(page,selected));
}
function scrollToBlock(path){
 const node=nodeFor(path);if(!node)return;
 const view=frame.contentWindow;
 view.scrollTo({top:Math.max(0,view.scrollY+node.getBoundingClientRect().top-24),behavior:'instant'});
}
function nodeFor(path){return frame.contentDocument?.querySelector(`[data-editor-block="${path}"]`);}
function markSelection(){for(const node of frame.contentDocument?.querySelectorAll('[data-editor-block]')||[])node.dataset.selected=String(node.dataset.editorBlock===selected);}
function annotate(){
 const doc=frame.contentDocument;
 const roots=[...doc.body.children].filter(node=>node.matches('section,figure'));
 draft.page.blocks.forEach((block,index)=>{
  const node=roots[index];if(!node)return;node.dataset.editorBlock=`blocks.${index}`;
  if(block.type==='section')node.querySelectorAll(':scope > .wrap > .layout-columns > .layout-column').forEach((column,c)=>{
   [...column.children].forEach((child,b)=>child.dataset.editorBlock=`blocks.${index}.columns.${c}.blocks.${b}`);
  });
 });
 markSelection();
}
function putHtml(html){
 if(inline){pendingHtml=html;return;}
 const doc=frame.contentDocument,x=frame.contentWindow.scrollX,y=frame.contentWindow.scrollY;
 const parsed=new DOMParser().parseFromString(html,'text/html');
 doc.body.replaceChildren(...[...parsed.body.childNodes].map(node=>doc.importNode(node,true)));
 annotate();frame.contentWindow.scrollTo(x,y);
}
const live=createLivePreview({request:async(page,signal)=>{
 validateComponentPage(page);
 if(!token)throw Error('Connect GitHub on the approved site address to update the Astro preview. Your practice edits are still here.');
 const response=await fetch('/editor-preview',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({page}),signal,cache:'no-store',credentials:'omit',redirect:'error'});
 if(response.status===401){token='';clearTimeout(pollTimer);workflow?.disconnect();$('sign-out').hidden=true;$('sign-in').hidden=false;}
 if(!response.ok)throw Error(await response.text());
 if(response.headers.get('X-Albion-Renderer')!=='astro-components')throw Error('The preview renderer could not be verified.');
 return response.text();
},onState:update=>{
 status.textContent=update.message+(update.status==='error'?' The last successful Astro preview remains visible.':'');
 if(update.html!==undefined)putHtml(update.html);
}});
function changed(){workflow?.changed();pendingHtml=null;refreshLabels();buttons();live.update(draft.page);}
function inlineNode(path,field){
 const node=nodeFor(path);if(!node)return null;
 if(field.inline==='heading')return node.querySelector('h1,h2');
 if(field.inline==='intro')return node.querySelector('.songs-hero-layout > div > p');
 if(field.inline.startsWith('paragraph-'))return node.querySelectorAll(':scope > p')[Number(field.inline.slice(10))];
 return null;
}
function beginInline(path,field){
 if(!token||workflow&&!workflowState?.ready){status.textContent='Connect GitHub first so the Astro preview can confirm your in-place edits. You can still try the fields beside the page.';return;}
 if(inline)finishInline();
 const node=inlineNode(path,field);if(!node){status.textContent='That field is not in the last successful preview yet. Use the field beside the page, then try again.';return;}
 const before=atPath(atPath(draft.page,path),field.path);
 inline={node,path,field,before,overlay:null};
 inline.overlay=createInlineOverlay({frame,node,label:field.label,value:before,onInput:value=>{if(!inline)return;draft.set(path,field.path,value);changed();},onFinish:finishInline});
}
function finishInline({cancel=false}={}){
 if(!inline)return;const {path,field,before,overlay}=inline;inline=null;overlay?.destroy();
 if(cancel){draft.set(path,field.path,before);changed();}
 draft.commit();
 if(pendingHtml){const html=pendingHtml;pendingHtml=null;putHtml(html);}
 select(selected);buttons();
}
function receive(event){
 const auth=readAuthMessage(event,{popup,origin:data.authOrigin});if(!auth)return;
 if(auth.handshake){popup.postMessage('authorizing:github',data.authOrigin);return;}
 token=auth.token;clearTimeout(authTimer);popup=null;$('sign-in').hidden=true;$('sign-out').hidden=false;if(workflow){void loadDocument();}else changed();
}
window.addEventListener('message',receive);
$('sign-in').addEventListener('click',()=>{
 if(location.origin!==data.origin){status.textContent='This isolated preview address is outside the existing GitHub sign-in approval. Sign-in has not been expanded for this prototype. No token is needed to explore the outline and forms.';return;}
 if(popup&&!popup.closed){popup.focus();return;}
 popup=window.open(data.authOrigin+'/auth?provider=github','museum-visual-signin','popup,width=680,height=760');
 if(!popup){status.textContent='Allow the sign-in popup, then choose Connect GitHub again.';return;}
 clearTimeout(authTimer);authTimer=setTimeout(()=>{popup?.close();popup=null;status.textContent='Sign-in timed out. Choose Connect GitHub to retry.';},600000);
});
$('sign-out').addEventListener('click',()=>{if(inline)finishInline();token='';operationController?.abort();clearTimeout(pollTimer);workflow?.disconnect();live.dispose();$('sign-out').hidden=true;$('sign-in').hidden=false;status.textContent='Disconnected. Reload to connect again. Saved drafts remain available after sign-in.';});
for(const action of ['undo','redo','reset'])$(action).addEventListener('click',()=>{if(inline)finishInline();draft.commit();draft[action]();outline();select(selected);changed();});
for(const width of ['desktop','phone'])$(width).addEventListener('click',()=>{$('preview-viewport').classList.toggle('phone',width==='phone');for(const id of ['desktop','phone'])$(id).setAttribute('aria-pressed',String(id===width));});
window.addEventListener('beforeunload',event=>{if(draft.changed){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>{inline?.overlay?.destroy();inline=null;token='';operationController?.abort();clearTimeout(pollTimer);workflow?.disconnect();popup?.close();clearTimeout(authTimer);live.dispose();window.removeEventListener('message',receive);});
frame.addEventListener('load',()=>{
 const doc=frame.contentDocument;doc.body.append(doc.importNode($('initial-render').content,true));annotate();outline();select(selected);buttons();
 status.textContent='Actual Astro components · choose a block to explore. Connect GitHub to render unsaved changes.';
 doc.addEventListener('click',event=>{
  if(event.target.closest('summary'))return;
  const block=event.target.closest('[data-editor-block]');if(!block)return;
  if(!event.target.isContentEditable)event.preventDefault();
  if(inline&&!inline.node.contains(event.target))finishInline();
  if(!inline)select(block.dataset.editorBlock);
 });
 doc.addEventListener('dblclick',event=>{
  const block=event.target.closest('[data-editor-block]');if(!block||inline)return;
  const value=atPath(draft.page,block.dataset.editorBlock);
  const field=editableFields(value).find(field=>field.inline&&inlineNode(block.dataset.editorBlock,field)?.contains(event.target));
  if(field)beginInline(block.dataset.editorBlock,field);
 });
});
async function editorCall(body){
 operationController=new AbortController();
 try{
  const response=await fetch('/editor-api',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.any([operationController.signal,AbortSignal.timeout(35000)]),cache:'no-store',credentials:'omit',redirect:'error'});
  const value=await response.json();
  if(!response.ok)throw Object.assign(Error(value.error?.message||'The operation could not be checked.'),{uncertain:value.error?.uncertain===true,code:value.error?.code});
  return value;
 }catch(error){
  if(error.uncertain!==undefined)throw error;
  throw Object.assign(Error(['save','publish'].includes(body.action)?'The write could not be confirmed. Keep your changes and reopen saved drafts to check before trying again.':'The operation could not be checked. Your edits remain here; try a read again shortly.'),{uncertain:['save','publish'].includes(body.action)});
 }finally{operationController=null;}
}
function renderWorkflow(state){
 workflowState=state;
 $('workflow-status').textContent=state.message;
 $('save-draft').disabled=!state.canSave;
 $('open-drafts').disabled=!token||state.busy||!state.ready;
 $('page-choice').disabled=!token||state.busy;
 if(state.ready){$('page-choice').value=state.pageId;$('public-page').href='/'+state.pageId;}
 $('check-draft').disabled=!state.ready||state.busy||!state.draftNumber&&!state.publicationRevision;
 $('check-draft').textContent=state.publicationRevision?'Check publication':'Check saved version';
 $('publish-draft').disabled=!state.canPublish;
 $('saved-preview').hidden=!state.canReview;
 if(state.canReview)$('saved-preview').href=state.checked.previewUrl;else $('saved-preview').removeAttribute('href');
 $('fields').inert=!state.ready;
 buttons();
 if(state.ready){const url=new URL(location.href);url.searchParams.set('page',state.pageId);if(state.draftNumber)url.searchParams.set('draft',state.draftNumber);else url.searchParams.delete('draft');history.replaceState(null,'',url);}
}
async function loadDocument(number,pageId){
 if(inline)finishInline();
 if(draft.changed&&!window.confirm('Discard your unsaved changes and open the saved version?'))return;
 clearTimeout(pollTimer);
 const params=new URL(location.href).searchParams;
 const requested=number??Number(params.get('draft'));
 const requestedPage=pageId??(workflow.state.ready?workflow.state.pageId:params.get('page')||data.page.slug);
 if(await workflow.load(Number.isSafeInteger(requested)&&requested>0?requested:undefined,requestedPage)){
  $('saved-drafts').hidden=true;if(workflow.state.draftNumber)startPolling();
 }
}
function startPolling(){clearTimeout(pollTimer);pollCount=0;schedulePoll();}
function schedulePoll(){
 const state=workflow.state;
 if(!token||document.hidden||pollCount>=15||state.uncertain||state.blocked||!state.publicationRevision&&(!state.draftNumber||state.checked?.canPublish||['failure','cancelled','error'].includes(state.checked?.validation)||state.checked?.deployment==='failure'))return;
 pollTimer=setTimeout(async()=>{pollCount++;if(document.hidden)return;if(!workflow.state.busy){if(workflow.state.publicationRevision)await workflow.publication();else await workflow.check();}schedulePoll();},8000);
}
async function listDrafts(page=1){
 const value=await workflow.list(page);if(!value)return;
 listPage=page;$('saved-drafts').hidden=false;$('draft-list').replaceChildren();
 for(const item of value.drafts){const button=document.createElement('button');button.type='button';button.textContent=`Open saved draft #${item.number}`;button.addEventListener('click',()=>void loadDocument(item.number));$('draft-list').append(button);}
 if(!value.drafts.length){const text=document.createElement('p');text.textContent='No saved drafts for this page on this list page.';$('draft-list').append(text);}
 $('more-drafts').hidden=!value.hasMore;
}
if(workflow){
 $('page-choice').addEventListener('change',async()=>{const choice=$('page-choice').value;await loadDocument(0,choice);$('page-choice').value=workflow.state.pageId;});
 $('open-published').addEventListener('click',()=>void loadDocument(0));
 $('save-draft').addEventListener('click',async()=>{if(inline)finishInline();draft.commit();if(await workflow.save())startPolling();});
 $('open-drafts').addEventListener('click',()=>void listDrafts());
 $('more-drafts').addEventListener('click',()=>void listDrafts(listPage+1));
 $('check-draft').addEventListener('click',async()=>{if(workflow.state.publicationRevision)await workflow.publication();else await workflow.check();startPolling();});
 $('saved-preview').addEventListener('click',event=>{if(!workflow.review())event.preventDefault();});
 $('publish-draft').addEventListener('click',async()=>{if(inline)finishInline();if(await workflow.publish())startPolling();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(pollTimer);});
}
frame.srcdoc='<!doctype html><html lang="en-GB"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/museum.css"><link rel="stylesheet" href="/albion.css"><link rel="stylesheet" href="/songs.css"><link rel="stylesheet" href="/layout.css"><style>body{margin:0}[data-editor-block]{position:relative;cursor:pointer}[data-editor-block]:hover{outline:2px dashed #486d9e;outline-offset:-3px}[data-selected="true"]{outline:3px solid #486d9e;outline-offset:-3px}[contenteditable]{outline:3px solid #b55b00!important;cursor:text;white-space:pre-wrap;text-transform:none;caret-color:currentColor}::selection{background:#ccdcf5;color:#142647}:focus-visible{outline:3px solid #b55b00;outline-offset:3px}a{pointer-events:none}</style></head><body></body></html>';
