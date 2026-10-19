import {fields,renderFact} from './fact.mjs';
import {renderPageContent,validateCollection} from './blocks.mjs';
const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('The editor preview is unavailable.');return r.json();};
const [template,context]=await Promise.all([get('/admin/preview-template.json'),get('/admin/preview-context.json')]);
for(const style of ['/styles.css','/museum.css','/albion.css','/songs.css'])window.CMS.registerPreviewStyle(style);
const markup=html=>window.h('div',{dangerouslySetInnerHTML:{__html:html}});
const message=error=>window.h('p',{style:{padding:'24px'}},`Complete the required fields to see the preview. ${error.message}`);
window.CMS.registerPreviewTemplate('blue-vinyl',({entry})=>{
 try{return markup(template.html.replace('<!-- EDITABLE_FACT -->',renderFact(Object.fromEntries(fields.map(key=>[key,entry.getIn(['data',key])||''])))));}catch(error){return message(error);}
});
window.CMS.registerPreviewTemplate('pages',({entry})=>{
 try{return markup(renderPageContent(entry.get('data').toJS(),context));}catch(error){return message(error);}
});
window.CMS.registerPreviewTemplate('museum-collections',({entry})=>{
 try{const c=validateCollection(entry.get('data').toJS());return window.h('section',{className:'wrap section'},window.h('h1',null,c.title),window.h('p',null,c.description),window.h('p',null,'Published members appear on this collection’s full-page preview.'));}catch(error){return message(error);}
});
window.CMS.init();
