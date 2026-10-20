export function editableFields(block, prefix='') {
 const fields=[];
 const add=(key,label,options={})=>fields.push({path:prefix+key,label,...options});
 if(typeof block.heading==='string')add('heading','Heading',{inline:'heading',multiline:true});
 if(block.type==='intro')add('text','Introduction',{inline:'intro',multiline:true});
 if(block.type==='text-panel')block.paragraphs.forEach((paragraph,index)=>{
  if(paragraph.parts.length===1&&paragraph.parts[0].type==='text')add(`paragraphs.${index}.parts.0.text`,`Paragraph ${index+1}`,{inline:`paragraph-${index}`,multiline:true});
 });
 if(block.type==='photograph')add('photograph','Photograph',{reference:true});
 if(block.type==='section'){
  add('background','Background',{choices:['white','navy','pale-blue']});
  add('spacing','Spacing',{choices:['compact','standard','roomy']});
 }
 return fields;
}
export function atPath(value,path){return path.split('.').reduce((item,key)=>item?.[key],value);}
export function blockEntries(page){
 const rows=[];
 page.blocks.forEach((block,index)=>{
  const path=`blocks.${index}`;rows.push({path,block});
  if(block.type==='section')block.columns.forEach((column,c)=>column.blocks.forEach((child,b)=>rows.push({path:`${path}.columns.${c}.blocks.${b}`,block:child,parent:path})));
 });
 return rows;
}
export function createDraft(initial){
 const baseline=structuredClone(initial);
 let page=structuredClone(baseline),history=[],future=[],group=null,version=0;
 const emit=()=>{version++;};
 return{
  get page(){return structuredClone(page);},get version(){return version;},
  get canUndo(){return group!==null||history.length>0;},get canRedo(){return future.length>0;},
  get changed(){return JSON.stringify(page)!==JSON.stringify(baseline);},
  set(blockPath,fieldPath,value){
   const block=blockEntries(page).find(row=>row.path===blockPath)?.block;
   const field=block&&editableFields(block).find(row=>row.path===fieldPath);
   if(!field||typeof value!=='string'||value.length>20000||(field.choices&&!field.choices.includes(value)))throw Error('Choose an editable field and supported value.');
   if(atPath(block,fieldPath)===value)return;
   if(group===null)group=structuredClone(page);
   const keys=fieldPath.split('.'),key=keys.pop();(keys.length?atPath(block,keys.join('.')):block)[key]=value;
   future=[];emit();
  },
  commit(){if(group!==null){history.push(group);history=history.slice(-100);group=null;}},
  undo(){this.commit();if(!history.length)return;future.push(page);page=history.pop();emit();},
  redo(){this.commit();if(!future.length)return;history.push(page);page=future.pop();emit();},
  reset(){this.commit();if(!this.changed)return;history.push(page);page=structuredClone(baseline);history=history.slice(-100);future=[];emit();}
 };
}
