import {createDraft,blockEntries,editableFields,atPath} from './state.mjs';
import {readAuthMessage} from './auth.mjs';
import {createLivePreview} from '../../lib/live-preview.mjs';
import {validateComponentPage} from '../../lib/component-preview.mjs';
const data=JSON.parse(document.querySelector('#visual-data').textContent);
const draft=createDraft(data.page),frame=document.querySelector('#canvas');
const status=document.querySelector('#preview-status'),form=document.querySelector('#fields');
let selected='blocks.0',token='',popup=null,authTimer=null,inline=null,pendingHtml=null;
const $=id=>document.getElementById(id);
const label=block=>block.heading||({'intro':'Page introduction','section':'Section','photograph':'Photograph','text-panel':'Text and sources','manager-performance':'Recorded performance'}[block.type]);
function buttons(){
 $('undo').disabled=!draft.canUndo;$('redo').disabled=!draft.canRedo;
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
  const button=document.createElement('button');button.type='button';button.dataset.path=row.path;if(row.parent)button.dataset.child='';button.textContent=label(row.block);button.setAttribute('aria-current',String(row.path===selected));button.addEventListener('click',()=>{select(row.path);nodeFor(row.path)?.scrollIntoView({block:'center',behavior:'instant'});});$('outline').append(button);
 }
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
 if(response.status===401){token='';$('sign-out').hidden=true;$('sign-in').hidden=false;}
 if(!response.ok)throw Error(await response.text());
 if(response.headers.get('X-Albion-Renderer')!=='astro-components')throw Error('The preview renderer could not be verified.');
 return response.text();
},onState:update=>{
 status.textContent=update.message+(update.status==='error'?' The last successful Astro preview remains visible.':'');
 if(update.html!==undefined)putHtml(update.html);
}});
function changed(){pendingHtml=null;buttons();live.update(draft.page);}
function inlineNode(path,field){
 const node=nodeFor(path);if(!node)return null;
 if(field.inline==='heading')return node.querySelector('h1,h2');
 if(field.inline==='intro')return node.querySelector('.songs-hero-layout > div > p');
 if(field.inline.startsWith('paragraph-'))return node.querySelectorAll(':scope > p')[Number(field.inline.slice(10))];
 return null;
}
function beginInline(path,field){
 if(!token){status.textContent='Connect GitHub first so the Astro preview can confirm your in-place edits. You can still try the fields beside the page.';return;}
 if(inline)finishInline();
 const node=inlineNode(path,field);if(!node){status.textContent='That field is not in the last successful preview yet. Use the field beside the page, then try again.';return;}
 const before=atPath(atPath(draft.page,path),field.path);
 node.textContent=before;node.contentEditable='plaintext-only';node.setAttribute('role','textbox');node.setAttribute('aria-label',field.label);node.tabIndex=0;
 inline={node,path,field,before};node.focus();
 const selection=frame.contentWindow.getSelection(),range=node.ownerDocument.createRange();range.selectNodeContents(node);range.collapse(false);selection.removeAllRanges();selection.addRange(range);
}
function finishInline({cancel=false}={}){
 if(!inline)return;const {node,path,field,before}=inline;inline=null;
 if(cancel){draft.set(path,field.path,before);changed();}
 node.removeAttribute('contenteditable');node.removeAttribute('role');node.removeAttribute('aria-label');node.removeAttribute('tabindex');draft.commit();
 if(pendingHtml){const html=pendingHtml;pendingHtml=null;putHtml(html);}
 select(selected);buttons();
}
function receive(event){
 const auth=readAuthMessage(event,{popup,origin:data.authOrigin});if(!auth)return;
 if(auth.handshake){popup.postMessage('authorizing:github',data.authOrigin);return;}
 token=auth.token;clearTimeout(authTimer);popup=null;$('sign-in').hidden=true;$('sign-out').hidden=false;changed();
}
window.addEventListener('message',receive);
$('sign-in').addEventListener('click',()=>{
 if(location.origin!==data.origin){status.textContent='This isolated preview address is outside the existing GitHub sign-in approval. Sign-in has not been expanded for this prototype. No token is needed to explore the outline and forms.';return;}
 if(popup&&!popup.closed){popup.focus();return;}
 popup=window.open(data.authOrigin+'/auth?provider=github','museum-visual-signin','popup,width=680,height=760');
 if(!popup){status.textContent='Allow the sign-in popup, then choose Connect GitHub again.';return;}
 clearTimeout(authTimer);authTimer=setTimeout(()=>{popup?.close();popup=null;status.textContent='Sign-in timed out. Choose Connect GitHub to retry.';},600000);
});
$('sign-out').addEventListener('click',()=>{if(inline)finishInline();token='';live.dispose();$('sign-out').hidden=true;$('sign-in').hidden=false;status.textContent='Disconnected. Reload this practice page to connect again. Nothing was saved.';});
for(const action of ['undo','redo','reset'])$(action).addEventListener('click',()=>{if(inline)finishInline();draft.commit();draft[action]();outline();select(selected);changed();});
for(const width of ['desktop','phone'])$(width).addEventListener('click',()=>{$('preview-viewport').classList.toggle('phone',width==='phone');for(const id of ['desktop','phone'])$(id).setAttribute('aria-pressed',String(id===width));});
window.addEventListener('beforeunload',event=>{if(draft.changed){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>{token='';popup?.close();clearTimeout(authTimer);live.dispose();window.removeEventListener('message',receive);});
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
 doc.addEventListener('input',event=>{if(!inline||event.target!==inline.node)return;const value=inline.node.innerText.replaceAll('\r\n','\n');draft.set(inline.path,inline.field.path,value);changed();});
 doc.addEventListener('focusout',event=>{if(inline&&event.target===inline.node)finishInline();});
 doc.addEventListener('keydown',event=>{if(inline&&event.key==='Escape'){event.preventDefault();finishInline({cancel:true});}if(inline&&(event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();finishInline();}});
 doc.addEventListener('paste',event=>{if(!inline||event.target!==inline.node)return;event.preventDefault();const text=event.clipboardData.getData('text/plain');const selection=frame.contentWindow.getSelection();if(!selection.rangeCount)return;const range=selection.getRangeAt(0);range.deleteContents();const node=doc.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);inline.node.dispatchEvent(new Event('input',{bubbles:true}));});
});
frame.srcdoc='<!doctype html><html lang="en-GB"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/museum.css"><link rel="stylesheet" href="/albion.css"><link rel="stylesheet" href="/songs.css"><link rel="stylesheet" href="/layout.css"><style>body{margin:0}[data-editor-block]{position:relative;cursor:pointer}[data-editor-block]:hover{outline:2px dashed #486d9e;outline-offset:-3px}[data-selected="true"]{outline:3px solid #486d9e;outline-offset:-3px}[contenteditable]{outline:3px solid #b55b00!important;cursor:text;white-space:pre-wrap;caret-color:currentColor}::selection{background:#ccdcf5;color:#142647}:focus-visible{outline:3px solid #b55b00;outline-offset:3px}a{pointer-events:none}</style></head><body></body></html>';
