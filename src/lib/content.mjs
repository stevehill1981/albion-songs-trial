import { readFile, readdir } from 'node:fs/promises';
import { validatePage,validateCollection,renderDocument } from './blocks.mjs';
import { validateFact,escapeHTML as esc } from './fact.mjs';
import { pathToFileURL } from 'node:url';
export async function loadContent({root=pathToFileURL(process.cwd()+'/')}={}){
 const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
 const folder=async(path,validate)=>{
  const files=(await readdir(new URL(path,root))).filter(f=>f.endsWith('.json')).sort();
  return Promise.all(files.map(async file=>{const value=validate(await read(path+file));if(file!==`${value.slug}.json`)throw Error(`The filename and stable address must agree: ${file}`);return value;}));
 };
 const [pages,collections,fact,shell]=await Promise.all([folder('content/pages/',validatePage),folder('content/collections/',validateCollection),read('content/fact.json').then(validateFact),readFile(new URL('legacy/shell.html',root),'utf8')]);
 if(!pages.some(p=>p.slug==='songs'))throw Error('The existing Songs address must remain available.');
 const known=new Set(collections.map(c=>c.slug));
 for(const p of pages)for(const c of p.collections)if(!known.has(c))throw Error(`Unknown museum collection ${c} on ${p.slug}.`);
 return {pages,collections,fact,shell};
}
export function renderListing(shell,{title,description,items,revision}){
 const content=`<section class="wrap section"><h1>${esc(title)}</h1><p>${esc(description)}</p><ul>${items.map(i=>`<li><h2><a href="${esc(i.href)}">${esc(i.title)}</a></h2><p>${esc(i.description)}</p></li>`).join('')}</ul></section>`;
 return shell.replace(' aria-current="page"','').replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(title)}</title>`).replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${esc(description)}">`).replace('<!-- PAGE_CONTENT -->',()=>content).replace('</head>',`<meta name="trial-revision" content="${esc(revision)}"></head>`);
}
export function publicPage(content,page,revision){
 let html=renderDocument(content.shell,page,{fact:content.fact,revision});
 if(page.slug!=='songs')html=html.replace(' aria-current="page"','');
 // Membership is visible on newly created pages; Songs keeps its preserved main markup.
 if(page.slug!=='songs'&&page.collections.length){
  const memberships=page.collections.map(slug=>{const c=content.collections.find(c=>c.slug===slug);return `<a href="/collections/${esc(slug)}">${esc(c.title)}</a>`;}).join(' · ');
  html=html.replace('</main>',`<nav class="wrap section" aria-label="Museum collections">${memberships}</nav></main>`);
 }
 return html;
}
