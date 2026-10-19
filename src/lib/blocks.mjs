import { escapeHTML as esc, renderFact, validateFact } from './fact.mjs';

const text=(name,label,{optional=false,lines=false}={})=>({name,label,kind:'text',optional,lines});
const url=(name,label='Source link')=>({name,label,kind:'url'});
const bool=(name,label)=>({name,label,kind:'boolean'});
const list=(name,label,fields,{min=0,max=200}={})=>({name,label,kind:'list',fields,min,max});
const inlineFields=[{name:'type',label:'Style',kind:'select',options:['text','emphasis','strong','link']},text('text','Text'),{...url('url','Link (only for Link style)'),optional:true}];
const inline=(name,label)=>list(name,label,inlineFields,{min:1});
const paragraphs=(name='paragraphs',label='Paragraphs')=>list(name,label,[inline('parts','Text and links')]);
const sources=(name='sources',label='Sources')=>list(name,label,[text('label','Link label'),url('url')],{max:30});
const anchor=[text('anchor','Section address'),text('navLabel','Jump-link label',{optional:true})];
const heading=text('heading','Heading (new line creates a line break)',{lines:true});
const factFields=[text('title','Heading'),text('text','Fact'),url('sourceURL'),text('sourceLabel','Source label')];
export const blockTypes=[
 {name:'intro',label:'Page introduction',fields:[heading,bool('emphasiseLastLine','Italicise last heading line'),text('text','Introduction',{lines:true}),text('buttonLabel','Songbook button label',{optional:true}),text('imageAlt','Photograph description'),inline('caption','Photograph caption and credits')]},
 {name:'story',label:'Sourced story and origin accounts',fields:[...anchor,heading,text('deck','Introduction'),paragraphs(),sources(),text('accountsHeading','Accounts heading',{optional:true}),list('accounts','Origin accounts',[text('title','Heading'),paragraphs()],{max:30}),sources('accountsSources','Sources for the accounts')]},
 {name:'accounts',label:'Accounts and footage',fields:[...anchor,heading,bool('emphasiseLastLine','Italicise last heading line'),text('deck','Introduction'),list('accounts','Accounts',[text('title','Heading'),paragraphs(),sources()],{min:1,max:30}),text('footageHeading','Footage heading'),inline('footageIntro','Match and broadcast details'),list('footageLinks','Footage links',[inline('parts','Link and description')],{min:1,max:30}),inline('footageNotice','Evidence caveat'),text('conclusion','Conclusion')]},
 {name:'songbook',label:'Searchable songbook',fields:[...anchor,heading,text('deck','Introduction'),text('scope','Catalogue scope and language notice'),list('songs','Songs',[text('title','Song title'),text('text','Description and evidence caveat'),text('category','Theme'),url('sourceURL'),text('sourceLabel','Source label')],{min:1,max:500}),inline('more','Further listening and sources')]},
 {name:'timeline',label:'Sourced timeline',fields:[...anchor,heading,text('deck','Introduction'),paragraphs(),text('factsLinkLabel','Facts jump-link label',{optional:true}),list('events','Timeline entries',[text('date','Date and evidence label'),text('title','Heading'),text('text','Account and caveat'),sources()],{min:1,max:100}),text('checksHeading','Open questions heading'),list('checks','Open questions',[{name:'type',label:'Style',kind:'select',options:['paragraph','heading']},{...text('text','Heading text'),optional:true},{...inline('parts','Paragraph text and links'),optional:true}],{min:1})]},
 {name:'facts',label:'Baggie Bird facts',fields:[...anchor,heading,text('imageAlt','Mascot description'),bool('includeBlueVinyl','Include the shared blue-vinyl fact first'),list('facts','Facts',factFields,{max:100})]},
 {name:'closing',label:'Closing and source notes',fields:[...anchor,heading,text('text','Closing paragraph'),text('linkLabel','Related page link label'),url('linkURL','Related page link'),text('notesHeading','Source notes heading'),paragraphs('notes','Source and artwork notes')]}
];
export const pageFields=[text('slug','Page address — set once; lower-case words separated by hyphens'),text('title','Page title'),text('description','Page description'),{name:'collections',label:'Museum collections',kind:'relations',optional:true}, {name:'blocks',label:'Content blocks',kind:'blocks',hint:'Add a template, then move it into position. Start with Page introduction.'}];
export const collectionFields=[text('slug','Collection address — set once'),text('title','Collection title'),text('description','Description')];
const identifier=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function validateIdentifier(value) { if(typeof value!=='string'||value.length>80||!identifier.test(value)) throw Error('Use a short, lower-case address with hyphens between words.'); return value; }
export function validateURL(value) {
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password)throw Error('Use a public HTTPS link without credentials.');
 return value;
}
function validateFields(value,fields,path) {
 if(!value||Array.isArray(value)||typeof value!=='object')throw Error(`${path}: expected content fields.`);
 const known=new Set(fields.map(f=>f.name));
 for(const key of Object.keys(value))if(!known.has(key))throw Error(`${path}: unexpected field ${key}.`);
 for(const f of fields){
  if(f.kind==='list'&&f.min===0&&value[f.name]===undefined&&!f.optional)value[f.name]=[];
  const v=value[f.name],p=`${path}.${f.name}`;
  if(f.optional&&(v===undefined||v===''||(Array.isArray(v)&&v.length===0)))continue;
  if(f.kind==='text'||f.kind==='url'||f.kind==='select'){
   if(typeof v!=='string'||(!f.optional&&!v.trim())||v.length>(f.kind==='text'?12000:2000))throw Error(`${p}: complete this field within its length limit.`);
   if(f.kind==='url')validateURL(v);
   if(f.kind==='select'&&!f.options.includes(v))throw Error(`${p}: choose a listed option.`);
  } else if(f.kind==='boolean'){if(typeof v!=='boolean')throw Error(`${p}: choose yes or no.`);}
  else if(f.kind==='list'){
   if(!Array.isArray(v)||v.length<f.min||v.length>f.max)throw Error(`${p}: check the number of entries.`);
   v.forEach((item,i)=>validateFields(item,f.fields,`${p}[${i}]`));
  } else if(f.kind==='relations'){
   if(!Array.isArray(v)||v.length>50||new Set(v).size!==v.length)throw Error(`${p}: choose distinct collections.`);
   v.forEach(validateIdentifier);
  } else if(f.kind==='blocks'){
   if(!Array.isArray(v)||!v.length||v.length>50)throw Error(`${p}: add between one and fifty sections.`);
   v.forEach(validateBlock);
  }
 }
 // Only link fragments may carry a URL. Every link must have one.
 if(known.has('type')&&known.has('url')){
  if(value.type==='link')validateURL(value.url);
  else if(value.url)throw Error(`${path}: only Link style uses a link.`);
 }
 if(known.has('type')&&known.has('parts')&&known.has('text')){
  if(value.type==='heading'&&(!value.text?.trim()||value.parts?.length))throw Error(`${path}: a heading needs heading text only.`);
  if(value.type==='paragraph'&&(!value.parts?.length||value.text))throw Error(`${path}: a paragraph needs text parts only.`);
 }
}
export function validateBlock(block){
 const spec=blockTypes.find(t=>t.name===block?.type);if(!spec)throw Error('Choose a known content template.');
 validateFields(block,[{name:'type',label:'Template',kind:'select',options:[spec.name]},...spec.fields],spec.label);
 if(block.type!=='intro')validateIdentifier(block.anchor);
 if(block.type==='facts'){
  block.facts.forEach(validateFact);
  if(!block.includeBlueVinyl&&!block.facts.length)throw Error('Add at least one fact.');
 }
 return block;
}
export function validatePage(page){
 validateFields(page,pageFields,'Page');page.collections??=[];validateIdentifier(page.slug);
 const reserved=['admin','assets','pages','collections','publication','version','index'];
 if(reserved.includes(page.slug))throw Error('That page address is reserved.');
 if(page.blocks[0].type!=='intro'||page.blocks.filter(b=>b.type==='intro').length!==1)throw Error('Start each page with one introduction.');
 const anchors=page.blocks.filter(b=>b.type!=='intro').map(b=>b.anchor);
 if(new Set(anchors).size!==anchors.length)throw Error('Section addresses must be unique within a page.');
 // Existing interaction IDs and cross-links require one of each interactive template.
 for(const type of ['songbook','accounts','facts'])if(page.blocks.filter(b=>b.type===type).length>1)throw Error(`Use one ${type} section per page.`);
 const ids=page.blocks.flatMap(b=>b.type==='intro'?[]:[b.anchor,`${b.anchor}-title`]);
 if(ids.some(id=>['main','song-list','song-filters','song-search','song-category','song-count','song-empty','show-all-songs','footage-1976'].includes(id)))throw Error('Section address conflicts with a built-in control.');
 if(new Set(ids).size!==ids.length)throw Error('Section addresses conflict with a heading address.');
 return page;
}
export function validateCollection(collection){validateFields(collection,collectionFields,'Collection');validateIdentifier(collection.slug);return collection;}
export function renderParts(parts){return parts.map(part=>{
 const t=esc(part.text);return part.type==='emphasis'?`<em>${t}</em>`:part.type==='strong'?`<strong>${t}</strong>`:part.type==='link'?`<a href="${esc(part.url)}">${t}</a>`:t;
}).join('');}
const ps=items=>items.map(p=>`<p>${renderParts(p.parts)}</p>`).join('');
const links=items=>items.map(s=>`<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(' · ');
function lines(text,emphasis=false){const a=text.split('\n').map(esc);if(emphasis)a[a.length-1]=`<em>${a.at(-1)}</em>`;return a.join('<br>');}
const bird='<img class="baggie-illustration" src="/assets/baggie-bird.webp" width="480" height="589" loading="lazy"';
const throstle=size=>`<img src="/assets/club-throstle.svg" width="${size}" height="${size}" alt="" aria-hidden="true">`;
export function renderBlock(b,{fact,anchors=[],songbookAnchor='songbook',factsAnchor='terrace-facts'}={}){
 validateBlock(b);
 const a=esc(b.anchor||''),h=lines(b.heading,b.emphasiseLastLine);
 if(b.type==='intro')return `<section class="songs-hero"><div class="wrap"><a href="https://maries-albion-scrapbook.stevehill1981.chatgpt.site/index.html">← Back to the museum</a><div class="songs-hero-layout"><div><h1>${h}</h1><p>${lines(b.text)}</p>${b.buttonLabel&&anchors.includes(songbookAnchor)?`<a class="button" href="#${esc(songbookAnchor)}">${esc(b.buttonLabel)}</a>`:''}</div><figure><img src="/assets/hawthorns.jpg" width="3840" height="1080" alt="${esc(b.imageAlt)}"><figcaption>${renderParts(b.caption)}</figcaption></figure></div></div></section>`;
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
 validatePage(page);const anchors=page.blocks.map(b=>b.anchor);const nav=page.blocks.filter(b=>b.navLabel);
 return page.blocks.map((b,i)=>renderBlock(b,{...context,anchors,songbookAnchor:page.blocks.find(b=>b.type==='songbook')?.anchor,factsAnchor:page.blocks.find(b=>b.type==='facts')?.anchor})+(i===0&&nav.length?`<nav class="songs-wayfinding wrap" aria-label="Explore terrace culture">${nav.map(n=>`<a href="#${esc(n.anchor)}">${esc(n.navLabel)}</a>`).join('')}</nav>`:'')).join('\n');
}
export function renderDocument(shell,page,context){
 const body=renderPageContent(page,context);
 return shell.replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(page.title)}</title>`).replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${esc(page.description)}">`).replace('<!-- PAGE_CONTENT -->',()=>body).replace('</head>',`<meta name="trial-revision" content="${esc(context.revision)}"></head>`);
}
export function cmsField(f){
 const base={name:f.name,label:f.label,required:!f.optional,...(f.hint?{hint:f.hint}:{})};
 if(f.kind==='text')return {...base,widget:f.lines?'text':f.name==='text'||f.name==='deck'||f.name==='scope'||f.name==='conclusion'?'text':'string'};
 if(f.kind==='url')return {...base,widget:'string',pattern:['^https://','Use an HTTPS source link.']};
 if(f.kind==='select')return {...base,widget:'select',options:f.options};
 if(f.kind==='boolean')return {...base,widget:'boolean',default:false};
 if(f.kind==='list')return {...base,required:f.min>0&&!f.optional,widget:'list',collapsed:true,min:f.min,max:f.max,summary:'{{fields.title}}{{fields.label}}{{fields.text}}',fields:f.fields.map(cmsField),default:[]};
 if(f.kind==='relations')return {...base,widget:'relation',collection:'museum-collections',search_fields:['title'],value_field:'slug',display_fields:['title'],multiple:true,required:false,default:[]};
 if(f.kind==='blocks')return {...base,widget:'list',collapsed:true,min:1,max:50,typeKey:'type',types:blockTypes.map(t=>({name:t.name,label:t.label,widget:'object',summary:'{{fields.heading}}',fields:t.fields.map(cmsField)}))};
 throw Error('Unknown editor field.');
}
