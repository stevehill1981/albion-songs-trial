import {blockEntries,editableFields,atPath} from './state.mjs';
const names={intro:'Page introduction',section:'Section',photograph:'Photograph','text-panel':'Text and sources','manager-performance':'Calculated results'};
export function documentRows(page,photographs=[]){
 return blockEntries(page).map(({path,parent,block})=>({path,parent,kind:block.type,label:names[block.type],
  fields:editableFields(block).filter(field=>field.inline).map(field=>({...field,value:atPath(block,field.path)})),
  linkedParagraphs:(block.paragraphs||[]).filter(p=>p.parts.some(part=>part.type!=='text')||p.parts.length!==1).map(p=>structuredClone(p.parts)),
  sources:structuredClone(block.sources||[]),caption:structuredClone(block.caption||[]),
  photograph:block.type==='photograph'?structuredClone(photographs.find(photo=>photo.id===block.photograph)||null):null,
  columns:block.type==='section'?block.columns.length:null,manager:block.type==='manager-performance'?block.manager:null}));
}
export function createDocumentCanvas({root,getPage,photographs,onEdit,onCommit,onSelect,onDetails}){
 const doc=root.ownerDocument,controls=new Map();let ready=false;
 const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 function parts(parent,values){for(const part of values){const node=make(part.type==='link'?'a':'span','',part.text);if(part.type==='link'){node.href=part.url;node.target='_blank';node.rel='noopener noreferrer';}parent.append(node);}}
 function photograph(photo){const figure=make('figure','document-photo'),image=make('img');image.src=photo.src;image.alt=photo.alt;image.loading='lazy';const caption=make('figcaption','',`${photo.caption} ${photo.author} · ${photo.licence} · `),source=make('a','','Image source');source.href=photo.url;source.target='_blank';source.rel='noopener noreferrer';caption.append(source);figure.append(image,caption);return figure;}
 function resize(input){input.style.height='auto';input.style.height=Math.max(input.scrollHeight,40)+'px';}
 function render(){
  controls.clear();root.replaceChildren();
  for(const row of documentRows(getPage(),photographs)){
   const block=make('article','document-block');block.dataset.documentBlock=row.path;if(row.parent)block.dataset.child='';
   const bar=make('div','document-block-bar'),kind=make('span','document-kind',row.label),details=make('button','document-details','Details');details.type='button';details.setAttribute('aria-label',`Details for ${row.fields.find(field=>field.path==='heading')?.value||row.label}`);details.addEventListener('click',()=>onDetails(row.path));bar.append(kind,details);block.append(bar);
   for(const field of row.fields){
    const input=make('textarea',field.path==='heading'?(row.kind==='intro'?'document-title':'document-heading'):'document-paragraph');
    input.rows=1;input.maxLength=20000;input.value=field.value;input.dataset.blockPath=row.path;input.dataset.fieldPath=field.path;
    input.setAttribute('aria-label',row.kind==='intro'&&field.path==='heading'?'Page heading':`${field.label} — ${row.fields.find(item=>item.path==='heading')?.value||row.label}`);
    input.addEventListener('focus',()=>onSelect(row.path));
    input.addEventListener('input',()=>{onEdit(row.path,field.path,input.value);resize(input);});
    input.addEventListener('blur',()=>onCommit());
    input.addEventListener('keydown',event=>{if(event.isComposing)return;if(event.key==='Escape'){event.preventDefault();input.blur();}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();input.blur();}});
    controls.set(row.path+'|'+field.path,input);block.append(input);
   }
   for(const values of row.linkedParagraphs){const p=make('p','document-linked');parts(p,values);block.append(p);}
   if(row.linkedParagraphs.length)block.append(make('p','document-note','Linked text is preserved. Use All pages & tools to edit its links and wording.'));
   if(row.columns)block.append(make('p','document-note',`${['','One','Two','Three'][row.columns]} ${row.columns===1?'column':'columns'} on the website. Open Details to change the section’s background or spacing.`));
   if(row.photograph){block.dataset.photographId=row.photograph.id;block.append(photograph(row.photograph));}
   if(row.manager)block.append(make('p','document-protected','Results are calculated from the archive. The full table is in the website preview.'));
   if(row.sources.length){const sources=make('details','document-sources');sources.append(make('summary','',`${row.sources.length} ${row.sources.length===1?'source':'sources'}`));const list=make('ul');for(const source of row.sources){const item=make('li'),link=make('a','',source.label);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);list.append(item);}sources.append(list);block.append(sources);}
   if(row.caption.length){const caption=make('details','document-sources');caption.append(make('summary','','Cover photograph credit'));const p=make('p');parts(p,row.caption);caption.append(p);block.append(caption);}
   root.append(block);
  }
  root.inert=!ready;for(const input of controls.values())resize(input);
 }
 return{render,setReady(value){ready=value;root.inert=!ready;},
  refresh(){const page=getPage();for(const block of root.querySelectorAll('[data-document-block]')){const value=atPath(page,block.dataset.documentBlock);block.querySelector('.document-details').setAttribute('aria-label',`Details for ${value.heading||names[value.type]}`);if(value.type==='photograph'&&block.dataset.photographId!==value.photograph){const photo=photographs.find(photo=>photo.id===value.photograph);if(photo){block.querySelector('.document-photo')?.replaceWith(photograph(photo));block.dataset.photographId=photo.id;}}}for(const input of controls.values()){const value=atPath(atPath(page,input.dataset.blockPath),input.dataset.fieldPath);if(doc.activeElement!==input&&typeof value==='string'&&input.value!==value){input.value=value;resize(input);}}},
  select(path,{scroll=false}={}){for(const block of root.querySelectorAll('[data-document-block]')){block.dataset.selected=String(block.dataset.documentBlock===path);if(scroll&&block.dataset.documentBlock===path)block.scrollIntoView({block:'nearest',behavior:'instant'});}},
  resize(){for(const input of controls.values())resize(input);}
 };
}
