import test from 'node:test';
import assert from 'node:assert/strict';
import {createInlineOverlay} from '../src/editor/visual/inline-overlay.mjs';
function harness(){
 const handlers={},animations=new Map(),changes=[],finishes=[];let overlay;
 const input={style:{},value:'',setAttribute(){},addEventListener(type,handler){handlers[type]=handler;},focus(){},setSelectionRange(){},remove(){this.removed=true;}};
 const view={requestAnimationFrame(callback){animations.set(1,callback);return 1;},cancelAnimationFrame(id){animations.delete(id);}};
 const doc={defaultView:view,createElement(type){assert.equal(type,'textarea');return input;},body:{append(value){assert.equal(value,input);}}};
 const frame={ownerDocument:doc,contentWindow:{getComputedStyle(){return {fontFamily:'Georgia',fontSize:'38px'};}},isConnected:true,clientLeft:0,clientTop:0,getBoundingClientRect(){return {left:100,top:200,right:800,bottom:600};}};
 const node={style:{visibility:'inherit'},isConnected:true,getBoundingClientRect(){return {left:30,top:40,width:400,height:80};}};
 overlay=createInlineOverlay({frame,node,label:'Heading',value:'Original',onInput:value=>changes.push(value),onFinish:value=>{finishes.push(value);overlay.destroy();}});
 return {input,node,frame,animations,changes,finishes,overlay,event(type,event={}){handlers[type](event);}};
}
test('the parent-owned field reports plain text and cancels all active positioning work on finish',()=>{
 const h=harness();assert.equal(h.node.style.visibility,'hidden');assert.equal(h.input.style.left,'130px');assert.equal(h.input.style.top,'240px');
 h.input.value='MiXeD\r\nSecond line';h.event('input');assert.deepEqual(h.changes,['MiXeD\nSecond line']);
 h.event('keydown',{key:'Enter',metaKey:true,preventDefault(){}});assert.deepEqual(h.finishes,[{cancel:false}]);assert.equal(h.node.style.visibility,'inherit');assert(h.input.removed);assert.equal(h.animations.size,0);
 h.event('input');h.event('blur');assert.equal(h.changes.length,1);assert.equal(h.finishes.length,1);
});
test('composition does not treat Escape or Enter as editor commands; ordinary Escape cancels',()=>{
 const h=harness();h.event('compositionstart');h.input.value='Composing';h.event('keydown',{key:'Escape'});assert.equal(h.finishes.length,0);
 h.event('compositionend');assert.deepEqual(h.changes,['Composing']);h.event('keydown',{key:'Escape',isComposing:true});assert.equal(h.finishes.length,0);
 h.event('keydown',{key:'Escape',preventDefault(){}});assert.deepEqual(h.finishes,[{cancel:true}]);assert.equal(h.animations.size,0);
});
test('blur finishes once and a removed preview target cannot leave a live overlay behind',()=>{
 const h=harness();h.event('blur');h.event('blur');assert.equal(h.finishes.length,1);assert.equal(h.animations.size,0);
 const removed=harness();removed.node.isConnected=false;removed.animations.get(1)();assert.equal(removed.finishes.length,1);assert.equal(removed.animations.size,0);assert(removed.input.removed);
});
