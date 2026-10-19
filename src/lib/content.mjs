import { readFile, readdir } from 'node:fs/promises';
import { validatePage,validateCollection,renderDocument,validateLink } from './blocks.mjs';
import { validateFact,escapeHTML as esc } from './fact.mjs';
import { loadMuseum } from './museum-content.mjs';
import { pathToFileURL } from 'node:url';
export async function loadContent({root=pathToFileURL(process.cwd()+'/')}={}){
 const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
 const folder=async(path,validate)=>{
  const files=(await readdir(new URL(path,root))).filter(f=>f.endsWith('.json')).sort();
  return Promise.all(files.map(async file=>{const value=validate(await read(path+file));if(file!==`${value.slug}.json`)throw Error(`The filename and stable address must agree: ${file}`);return value;}));
 };
 const [pages,collections,fact,shell]=await Promise.all([folder('content/pages/',validatePage),folder('content/collections/',validateCollection),read('content/fact.json').then(validateFact),readFile(new URL('legacy/shell.html',root),'utf8')]);
 const site=await read('site.json').catch(error=>{if(error.code==='ENOENT')return {};throw error;});
 if(site.museum&&!['home','hawthorns','results','wartime','songs'].every(slug=>pages.some(p=>p.slug===slug)))throw Error('All five preserved museum pages must remain available.');
 if(!pages.some(p=>p.slug==='songs'))throw Error('The existing Songs address must remain available.');
 const known=new Set(collections.map(c=>c.slug));
 for(const p of pages)for(const c of p.collections)if(!known.has(c))throw Error(`Unknown museum collection ${c} on ${p.slug}.`);
 const museum=pages.some(p=>p.slug==='home')?await loadMuseum(root):{};
 const templates=await folder('content/page-templates/',validatePage).catch(error=>{if(error.code==='ENOENT'&&!pages.some(p=>p.slug==='home'))return [];throw error;});
 const navigation=pages.some(p=>p.slug==='home')?JSON.parse(await readFile(new URL('content/settings/navigation.json',root),'utf8')):null;
 if(navigation)for(const items of Object.values(navigation.menus)){if(!Array.isArray(items)||!items.length)throw Error('Navigation must contain links.');for(const item of items){if(typeof item.label!=='string'||!item.label.trim())throw Error('Navigation links need labels.');validateLink(item.href);}}
 const nativeShells={};
 for(const slug of ['home','hawthorns','results','wartime'])if(pages.some(p=>p.slug===slug))nativeShells[slug]=await readFile(new URL(`legacy/${slug}-shell.html`,root),'utf8');
 return {pages,collections,fact,shell,templates,nativeShells,navigation,...museum};
}
export function renderListing(shell,{title,description,items=[],revision,body}){
 const content=body??`<section class="wrap section"><h1>${esc(title)}</h1><p>${esc(description)}</p><ul>${items.map(i=>`<li><h2><a href="${esc(i.href)}">${esc(i.title)}</a></h2><p>${esc(i.description)}</p></li>`).join('')}</ul></section>`;
 return shell.replace(' aria-current="page"','').replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(title)}</title>`).replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${esc(description)}">`).replace('<!-- PAGE_CONTENT -->',()=>content).replace('</head>',`<meta name="trial-revision" content="${esc(revision)}"></head>`);
}
export function publicPage(content,page,revision,body){
 let html=renderDocument(content.nativeShells?.[page.slug]||content.shell,page,{...content,fact:content.fact,revision},body);
 if(content.navigation){const menu=content.navigation.menus[page.slug]||content.navigation.menus.songs;html=html.replace(/<nav aria-label="Main navigation">([\s\S]*?)<\/nav>/,(_,old)=>{const anchors=[...old.matchAll(/<a([^>]*?)href="([^"]*)"([^>]*)>[\s\S]*?<\/a>/g)];return `<nav aria-label="Main navigation">${menu.map(item=>{const match=anchors.find(a=>a[2].replaceAll('&amp;','&')===item.href);return `<a${match?match[1]:' '}href="${esc(item.href)}"${match?match[3]:''}>${esc(item.label)}</a>`;}).join('')}</nav>`;});}
 const kinds=JSON.stringify(page.blocks.map(b=>b.type));
 const resources=['/layout.css',...(kinds.includes('home-')||kinds.includes('museum')?['/app.js']:[]),...(kinds.includes('hawthorns-')?['/hawthorns.css','/hawthorns.js']:[]),...(kinds.includes('results-')?['/results.css',...(kinds.includes('results-ledger')?['/results.js']:[])]:[]),...(kinds.includes('wartime-')?['/results.css','/wartime.css',...(kinds.includes('wartime-wartime-ledger')?['/wartime.js']:[])]:[])];
 for(const path of resources)if(!html.includes(`"${path}"`))html=html.replace('</head>',`${path.endsWith('.css')?`<link rel="stylesheet" href="${path}">`:`<script ${path.includes('results.js')||path.includes('wartime.js')?'type="module"':'defer'} src="${path}"></script>`}</head>`);
 for(const [kind,slug,id]of [['museum','home','photo-viewer'],['hawthorns-','hawthorns','ground-photo-viewer']])if(kinds.includes(kind)&&!html.includes(`id="${id}"`)){const dialog=content.nativeShells?.[slug]?.match(new RegExp(`<dialog id="${id}"[\\s\\S]*?</dialog>`))?.[0];if(dialog)html=html.replace('</body>',`${dialog}</body>`);}
 if(content.quiz&&kinds.includes('home-'))html=html.replace('</body>',`<script id="quiz-data" type="application/json">${JSON.stringify(content.quiz.questions).replaceAll('<','\\u003c')}</script></body>`);
 if(!content.nativeShells?.[page.slug]&&page.slug!=='songs')html=html.replace(' aria-current="page"','');
 // Membership is visible on newly created pages; Songs keeps its preserved main markup.
 if(!content.nativeShells?.[page.slug]&&page.slug!=='songs'&&page.collections.length){
  const memberships=page.collections.map(slug=>{const c=content.collections.find(c=>c.slug===slug);return `<a href="/collections/${esc(slug)}">${esc(c.title)}</a>`;}).join(' · ');
  html=html.replace('</main>',`<nav class="wrap section" aria-label="Museum collections">${memberships}</nav></main>`);
 }
 return html;
}
