import {renderManagerPerformance} from './manager-performance.mjs';
import {photoURL} from './image-paths.mjs';
import patterns from './museum-patterns.json' with {type:'json'};
import {escapeHTML as esc,renderFact,validateFact} from './fact.mjs';
import {validateBlock,validatePage} from './block-schema.mjs';
import {renderParts} from './inline-parts.mjs';
export {blockTypes,pageFields,collectionFields,validateIdentifier,validateLink,validateURL,validateBlock,validatePage,validateCollection,cmsField} from './block-schema.mjs';
export {renderParts} from './inline-parts.mjs';
export const patternTypes=patterns;

const ps=items=>items.map(p=>`<p>${renderParts(p.parts)}</p>`).join('');
const links=items=>items.map(s=>`<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(' · ');
function lines(text,emphasis=false){const a=text.split('\n').map(esc);if(emphasis)a[a.length-1]=`<em>${a.at(-1)}</em>`;return a.join('<br>');}
const bird='<img class="baggie-illustration" src="/assets/baggie-bird.webp" width="480" height="589" loading="lazy"';
const throstle=size=>`<img src="/assets/club-throstle.svg" width="${size}" height="${size}" alt="" aria-hidden="true">`;
export function renderBlock(b,context={}){
 const {fact,anchors=[],songbookAnchor='songbook',factsAnchor='terrace-facts',photographs={},museumMarkup,photoCredits=''}=context;
 validateBlock(b);
 const a=esc(b.anchor||''),h=lines(b.heading||'',b.emphasiseLastLine);
 const pattern=patterns.find(p=>p.name===b.type);
 if(pattern)return pattern.template.replace(/\{\{(field[0-9]+)\}\}/g,(_,key)=>esc(b[key]||'')).replace('<!-- PHOTO_CREDITS -->',()=>`<ul class="collection-credits">${photoCredits}</ul>`);
 if(b.type==='museum'){if(!museumMarkup)throw Error('The exhibit collection is unavailable.');return museumMarkup;}
 if(b.type==='manager-performance')return renderManagerPerformance(b,context);
 if(b.type==='text-panel')return `<section class="wrap section" id="${a}"><h2>${h}</h2>${ps(b.paragraphs)}${links(b.sources)}</section>`;
 if(b.type==='photograph'){const image=Object.hasOwn(photographs,b.photograph)?photographs[b.photograph]:null;if(!image)throw Error('Choose a photograph from the credited library.');return `<figure class="wrap section" id="${a}"><h2>${h}</h2><img src="${esc(photoURL(image.file))}" width="${image.width}" height="${image.height}" alt="${esc(image.alt)}" loading="lazy"><figcaption>${esc(image.caption)} ${esc(image.author)} · <a href="${esc(image.url)}">Image source</a> · ${esc(image.licence)}</figcaption></figure>`;}
 if(b.type==='link-cards')return `<section class="wrap section" id="${a}"><h2>${h}</h2><div class="layout-cards">${b.cards.map(c=>`<article><h3><a href="${esc(c.href)}">${esc(c.title)}</a></h3><p>${esc(c.text)}</p></article>`).join('')}</div></section>`;
 if(b.type==='section')return `<section id="${a}" class="layout-section layout-bg-${b.background} layout-spacing-${b.spacing}"><div class="wrap">${h?`<h2>${h}</h2>`:''}<div class="layout-columns layout-columns-${b.columns.length}">${b.columns.map(c=>`<div class="layout-column">${c.blocks.map(child=>renderBlock(child,context)).join('')}</div>`).join('')}</div></div></section>`;
 if(b.type==='intro')return `<section class="songs-hero"><div class="wrap"><a href="/">← Back to the museum</a><div class="songs-hero-layout"><div><h1>${h}</h1><p>${lines(b.text)}</p>${b.buttonLabel&&anchors.includes(songbookAnchor)?`<a class="button" href="#${esc(songbookAnchor)}">${esc(b.buttonLabel)}</a>`:''}</div><figure><img src="/assets/hawthorns.jpg" width="3840" height="1080" alt="${esc(b.imageAlt)}"><figcaption>${renderParts(b.caption)}</figcaption></figure></div></div></section>`;
 if(b.type==='story')return `<section class="section wrap songs-story" id="${a}" aria-labelledby="${a}-title"><div><h2 id="${a}-title">${h}</h2><p class="songs-deck">${esc(b.deck)}</p>${ps(b.paragraphs)}${links(b.sources)}</div><div class="origin-accounts">${b.accountsHeading?`<h3>${esc(b.accountsHeading)}</h3>`:''}${b.accounts.map((c,i)=>`<details${i===0?' open':''}><summary>${esc(c.title)}</summary>${ps(c.paragraphs)}</details>`).join('')}${links(b.accountsSources)}</div></section>`;
 if(b.type==='accounts')return `<section class="shepherd-band" id="${a}" aria-labelledby="${a}-title"><div class="wrap section"><div class="hymn-heading">${throstle(100)}<div><h2 id="${a}-title">${h}</h2><p>${esc(b.deck)}</p></div></div><div class="hymn-accounts">${b.accounts.map(c=>`<article><h3>${esc(c.title)}</h3>${ps(c.paragraphs)}${links(c.sources)}</article>`).join('')}</div><div id="footage-1976"><h3>${esc(b.footageHeading)}</h3><p>${renderParts(b.footageIntro)}</p><ul>${b.footageLinks.map(l=>`<li>${renderParts(l.parts)}</li>`).join('')}</ul><p>${renderParts(b.footageNotice)}</p></div><p class="hymn-conclusion">${esc(b.conclusion)}</p></div></section>`;
 if(b.type==='songbook'){
  const themes=[...new Set(b.songs.map(s=>s.category))];
  return `<section class="wrap section" id="${a}" aria-labelledby="${a}-title"><div class="section-heading"><div><h2 id="${a}-title">${h}</h2><p>${esc(b.deck)}</p></div>${throstle(70)}</div><p class="songbook-scope">${esc(b.scope)}</p><form id="song-filters" class="song-filters" hidden role="search"><label>Search songs, people or tunes<input id="song-search" type="search" placeholder="Try Astle, Go West or Wolves"></label><label>Browse by theme<select id="song-category"><option value="">All themes</option>${themes.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label><button type="reset">Reset filters</button></form><p id="song-count" role="status">${b.songs.length} songs and music selections in this catalogue.</p><div id="song-list">${b.songs.map(s=>`<article class="song-entry" data-category="${esc(s.category)}"><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div><div class="song-reference"><span>${esc(s.category)}</span><a href="${esc(s.sourceURL)}">${esc(s.sourceLabel)}<span class="sr-only">: ${esc(s.title)}</span></a></div></article>`).join('\n')}</div><div id="song-empty" hidden><h3>No songs match those filters.</h3><p>Try a different name or show the whole songbook.</p><button type="button" id="show-all-songs">Show all songs</button></div><p class="songbook-more">${renderParts(b.more)}</p></section>`;
 }
 if(b.type==='timeline')return `<section class="liquidator-band" id="${a}" aria-labelledby="${a}-title"><div class="wrap section"><div class="section-heading"><div><h2 id="${a}-title">${h}</h2><p class="songs-deck">${esc(b.deck)}</p></div>${throstle(90)}</div><div class="liquidator-intro">${ps(b.paragraphs)}${b.factsLinkLabel&&anchors.includes(factsAnchor)?`<a href="#${esc(factsAnchor)}">${esc(b.factsLinkLabel)}</a>`:''}</div><ol class="liquidator-timeline">${b.events.map(e=>`<li><div class="liquidator-date">${esc(e.date)}</div><div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p>${links(e.sources)}</div></li>`).join('\n')}</ol><details class="liquidator-open"><summary>${esc(b.checksHeading)}</summary>${b.checks.map(c=>c.type==='heading'?`<h3>${esc(c.text)}</h3>`:`<p>${renderParts(c.parts)}</p>`).join('')}</details></div></section>`;
 if(b.type==='facts'){
  const items=[...(b.includeBlueVinyl?[validateFact(fact)]:[]),...b.facts];
  return `<aside class="baggie-fact-band liquidator-facts" id="${a}" aria-label="Baggie Bird’s music and terrace facts"><div class="wrap baggie-fact" data-fact-rotator>${bird} alt="${esc(b.imageAlt)}"><div class="fact-body"><h2>${h}</h2>${items.map(renderFact).join('\n')}</div><div class="fact-controls" hidden><button type="button" data-next-fact>Another fact →</button><p role="status" data-fact-status>Fact 1 of ${items.length}</p></div></div></aside>`;
 }
 if(b.type==='closing')return `<section class="wrap section songs-close"${b.navLabel?` id="${a}"`:""}><h2>${h}</h2><p>${esc(b.text)}</p><a href="${esc(b.linkURL)}">${esc(b.linkLabel)}</a><details><summary>${esc(b.notesHeading)}</summary>${ps(b.notes)}</details></section>`;
 throw Error('Unknown content template.');
}
export function renderPageContent(page,context){
 validatePage(page);const anchors=page.blocks.map(b=>b.anchor);const nav=page.blocks.filter(b=>b.navLabel);const native=page.blocks.some(b=>patterns.some(p=>p.name===b.type));
 const output=page.blocks.map((b,i)=>renderBlock(b,{...context,anchors,songbookAnchor:page.blocks.find(b=>b.type==='songbook')?.anchor,factsAnchor:page.blocks.find(b=>b.type==='facts')?.anchor})+(i===0&&!native&&nav.length?`<nav class="songs-wayfinding wrap" aria-label="Explore terrace culture">${nav.map(n=>`<a href="#${esc(n.anchor)}">${esc(n.navLabel)}</a>`).join('')}</nav>`:'')).join('\n');
 const ids=[...output.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)throw Error('Two blocks use the same section or control address.');
 return output;
}
export function renderDocument(shell,page,context,suppliedBody){
 const body=suppliedBody??renderPageContent(page,context);
 return shell.replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(page.title)}</title>`).replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${esc(page.description)}">`).replace('<!-- PAGE_CONTENT -->',()=>body).replace('</head>',`<meta name="trial-revision" content="${esc(context.revision)}"></head>`);
}
