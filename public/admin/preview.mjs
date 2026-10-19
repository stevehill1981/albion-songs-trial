import { fields,renderFact } from './fact.mjs';
const response=await fetch('/admin/preview-template.json');
if(!response.ok)throw Error('The Songs preview template is unavailable.');
const template=(await response.json()).html;
for(const style of ['/styles.css','/museum.css','/albion.css','/songs.css']) window.CMS.registerPreviewStyle(style);
window.CMS.registerPreviewTemplate('blue-vinyl',({entry})=>{
  const fact=Object.fromEntries(fields.map(key=>[key,entry.getIn(['data',key])||'']));
  try {
    return window.h('div',{dangerouslySetInnerHTML:{__html:template.replace('<!-- EDITABLE_FACT -->',renderFact(fact))}});
  } catch {
    return window.h('p',{style:{padding:'24px'}},'Complete the heading, fact, HTTPS source link and source label to see the preview.');
  }
});
window.CMS.init();
