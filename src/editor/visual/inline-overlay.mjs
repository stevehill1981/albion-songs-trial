// Input belongs to the parent editor. Safari suppresses event handlers inside
// the script-free preview sandbox, even when a parent registered the handler.
export function createInlineOverlay({frame,node,label,value,onInput,onFinish}){
 const doc=frame.ownerDocument,view=doc.defaultView;
 const input=doc.createElement('textarea');
 input.className='inline-editor';input.setAttribute('aria-label',label+' on page');
 input.setAttribute('aria-description','Type plain text. Escape cancels; Control or Command and Enter finishes.');
 input.value=value;input.rows=1;
 const style=frame.contentWindow.getComputedStyle(node),visibility=node.style.visibility;
 for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','wordSpacing','textAlign','textIndent','color'])input.style[key]=style[key];
 let active=true,animation=null,composing=false;
 const text=()=>input.value.replaceAll('\r\n','\n');
 function position(){
  if(!active)return;
  if(!node.isConnected||!frame.isConnected){onFinish({cancel:false});return;}
  const outer=frame.getBoundingClientRect(),inner=node.getBoundingClientRect();
  const left=outer.left+frame.clientLeft+inner.left,top=outer.top+frame.clientTop+inner.top;
  for(const [key,value]of Object.entries({left:left+'px',top:top+'px',width:inner.width+'px',height:Math.max(inner.height,42)+'px'}))if(input.style[key]!==value)input.style[key]=value;
  input.style.clipPath=`inset(${Math.max(0,outer.top-top)}px ${Math.max(0,left+inner.width-outer.right)}px ${Math.max(0,top+Math.max(inner.height,42)-outer.bottom)}px ${Math.max(0,outer.left-left)}px)`;
  animation=view.requestAnimationFrame(position);
 }
 input.addEventListener('input',()=>{if(active)onInput(text());});
 input.addEventListener('compositionstart',()=>{if(active)composing=true;});
 input.addEventListener('compositionend',()=>{if(active){composing=false;onInput(text());}});
 input.addEventListener('keydown',event=>{
  if(!active||composing||event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault();onFinish({cancel:true});}
  else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();onFinish({cancel:false});}
 });
 input.addEventListener('blur',()=>{if(active)onFinish({cancel:false});});
 doc.body.append(input);node.style.visibility='hidden';position();input.focus();input.setSelectionRange(input.value.length,input.value.length);
 return{destroy(){if(!active)return;active=false;view.cancelAnimationFrame(animation);node.style.visibility=visibility;input.remove();}};
}
