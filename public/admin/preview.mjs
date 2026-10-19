import {registerImageWidget} from './image-widget.mjs';
import {photoURL} from './image-paths.mjs';
import {renderPhoto} from './image-library.mjs';
import {fields,renderFact,escapeHTML} from './fact.mjs';
import {registerLayoutWidget}from './layout-widget.mjs';
import {renderPageContent,validateCollection} from './blocks.mjs';
const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('The editor preview is unavailable.');return r.json();};
const [template,context]=await Promise.all([get('/admin/preview-template.json'),get('/admin/preview-context.json')]);
registerLayoutWidget();
registerImageWidget();
for(const style of ['/styles.css','/museum.css','/albion.css','/songs.css','/hawthorns.css','/results.css','/wartime.css','/layout.css'])window.CMS.registerPreviewStyle(style);
const markup=html=>window.h('div',{dangerouslySetInnerHTML:{__html:html}});
const message=error=>window.h('p',{style:{padding:'24px'}},`Complete the required fields to see the preview. ${error.message}`);
window.CMS.registerPreviewTemplate('blue-vinyl',({entry})=>{
 try{return markup(template.html.replace('<!-- EDITABLE_FACT -->',renderFact(Object.fromEntries(fields.map(key=>[key,entry.getIn(['data',key])||''])))));}catch(error){return message(error);}
});
const pagePreview=({entry})=>{
 try{return markup(renderPageContent(entry.get('data').toJS(),context));}catch(error){return message(error);}
};
window.CMS.registerPreviewTemplate('pages',pagePreview);
window.CMS.registerPreviewTemplate('page-templates',({entry})=>pagePreview({entry:entry.setIn(['data','collections'],entry.getIn(['data','collections'])||[])}));
for(const name of ['exhibits','eras','sources','quiz'])window.CMS.registerPreviewTemplate(name,({entry})=>{const data=entry.get('data').toJS();return window.h('section',{className:'wrap section'},window.h('h1',null,data.title||data.caption||data.label||'History quiz'),...(data.body||[data.intro||data.url||'']).map((text,i)=>window.h('p',{key:i},text)),data.questions?window.h('p',null,`${data.questions.length} quiz questions. Use the full-page preview to test them.`):null);});
window.CMS.registerPreviewTemplate('photographs',({entry,getAsset})=>{
 try{const photo=entry.get('data').toJS();if(!photo.file)return message(new Error('Choose an image first.'));const path=photoURL(photo.file);const src=getAsset(path.startsWith('/uploads/')?path.split('/').pop():path);return markup(`<section class="wrap section"><h1>${escapeHTML(photo.caption||'Photograph')}</h1>${renderPhoto(photo,{src,dimensions:false})}</section>`);}catch(error){return message(error);}
});
window.CMS.registerPreviewTemplate('museum-collections' ,({entry})=>{
 try{const c=validateCollection(entry.get('data').toJS());return window.h('section',{className:'wrap section'},window.h('h1',null,c.title),window.h('p',null,c.description),window.h('p',null,'Published members appear on this collection’s full-page preview.'));}catch(error){return message(error);}
});
window.CMS.init();
