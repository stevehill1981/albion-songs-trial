const idPattern=/^[a-z][a-z0-9-]{0,63}$/;
const reserved=new Set(['api','assets','editor','editor-lab','keystatic','studio','studio-api','studio-preview','studio-saved','studio-release']);
function requireValue(value,message){if(!value)throw Error(message);}
export function paths(workspace){
 const rows=new Map(workspace.pages.map(page=>[page.id,page])),result=new Map();
 function path(id,seen=new Set()){
  requireValue(!seen.has(id),'A page cannot sit inside itself or one of its children.');
  requireValue(rows.has(id),'Choose an existing parent page.');
  if(result.has(id))return result.get(id);
  seen.add(id);const page=rows.get(id);const value=(page.parent?path(page.parent,seen):'')+'/'+page.segment;result.set(id,value);return value;
 }
 for(const id of rows.keys())path(id);return result;
}
export function validateWorkspace(value){
 requireValue(value&&value.version===1&&value.slug==='studio-proof'&&Array.isArray(value.pages)&&value.pages.length>0&&value.pages.length<=20,'Keep between 1 and 20 pages in this local proof.');
 requireValue(Object.keys(value).every(k=>['version','slug','pages','redirects'].includes(k)),'Unsupported site settings.');
 const ids=new Set();
 for(const page of value.pages){
  requireValue(page&&Object.keys(page).every(k=>['id','parent','segment','title','markdown'].includes(k))&&idPattern.test(page.id)&&!ids.has(page.id),'Every page needs a unique stable identity.');ids.add(page.id);
  requireValue(page.parent===null||idPattern.test(page.parent),'Choose a valid parent.');
  requireValue(typeof page.segment==='string'&&idPattern.test(page.segment)&&!reserved.has(page.segment),'Use a short address with lower-case words and hyphens. That address may be reserved.');
  requireValue(typeof page.title==='string'&&page.title.trim().length>0&&page.title.length<=150,'Every page needs a title.');
  requireValue(typeof page.markdown==='string'&&page.markdown.length<=20000,'Keep page content below 20,000 characters.');
 }
 const resolved=paths(value),unique=new Set(resolved.values());requireValue(unique.size===value.pages.length,'Two pages cannot share the same address.');
 requireValue(Array.isArray(value.redirects)&&value.redirects.length<=200,'Too many saved redirects.');
 const redirects=new Set();for(const r of value.redirects){requireValue(r&&Object.keys(r).length===2&&typeof r.from==='string'&&/^\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(r.from)&&ids.has(r.page)&&!unique.has(r.from)&&!redirects.has(r.from),'An old address conflicts with a current page or another redirect.');redirects.add(r.from);}
 requireValue(new TextEncoder().encode(JSON.stringify(value)).length<=60000,'Keep the complete trial site below 60 KB.');return value;
}
export function movePage(workspace,id,parent,segment){
 const next=structuredClone(workspace),oldPaths=paths(validateWorkspace(workspace)),page=next.pages.find(p=>p.id===id);requireValue(page,'Choose an existing page.');page.parent=parent;page.segment=segment;
 const newPaths=paths(next),current=new Set(newPaths.values());
 for(const redirect of next.redirects)if(current.has(redirect.from))requireValue(newPaths.get(redirect.page)===redirect.from,'That address is reserved by an existing page redirect.');
 const redirects=new Map(next.redirects.filter(r=>!current.has(r.from)).map(r=>[r.from,r]));
 for(const [pageId,old]of oldPaths)if(newPaths.get(pageId)!==old&&!current.has(old))redirects.set(old,{from:old,page:pageId});
 next.redirects=[...redirects.values()];return validateWorkspace(next);
}
export function seedWorkspace(){return{version:1,slug:'studio-proof',pages:[
 {id:'managers',parent:null,segment:'managers',title:'Managers',markdown:'Explore Albion managers and their stories.'},
 {id:'darren-moore',parent:'managers',segment:'darren-moore',title:'Darren Moore',markdown:'Birmingham-born Darren Moore joined Albion in September 2001.\n\n{% story heading="Before and at Albion" text="He helped win promotions in 2002 and 2004." sourceLabel="Albion: Darren Moore in profile" sourceURL="https://www.wba.co.uk/news/2018/may/darren-moore-in-profile" /%}\n\n{% photograph heading="The Hawthorns" photograph="hawthorns" /%}'},
 {id:'local-child',parent:'managers',segment:'local-child',title:'Practice page',markdown:'This page exists only in the local studio proof.'}
 ],redirects:[]};}
