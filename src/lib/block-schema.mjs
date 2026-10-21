import metadata from './pattern-metadata.json' with {type:'json'};
import {validateFact} from './fact.mjs';
const patterns=metadata.patterns;

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
const simpleTypes=['manager-performance','text-panel','photograph','link-cards','facts','story'];
blockTypes.push(
 {name:'manager-performance',label:'Manager performance',fields:[...anchor,heading,{name:'manager',label:'Manager',kind:'manager'}]},
 {name:'text-panel',label:'Text and sources',fields:[...anchor,heading,paragraphs(),sources()]},
 {name:'photograph',label:'Credited photograph',fields:[...anchor,heading,{name:'photograph',label:'Photograph',kind:'reference',collection:'photographs',valueField:'id',searchField:'caption'}]},
 {name:'link-cards',label:'Related page cards',fields:[...anchor,heading,list('cards','Related pages',[text('title','Title'),text('text','Description'),{name:'href',label:'Page address or HTTPS link',kind:'link'}],{min:1,max:30})]},
 {name:'section',label:'Section and columns',fields:[...anchor,text('heading','Section heading',{optional:true}),{name:'background',label:'Background',kind:'select',options:['white','navy','pale-blue']},{name:'spacing',label:'Spacing',kind:'select',options:['compact','standard','roomy']},list('columns','Columns',[{name:'blocks',label:'Column content',kind:'children'}],{min:1,max:3})]},
 {name:'museum',label:'Eras and exhibit collection',fields:[...anchor]},
 ...patterns.map(p=>({name:p.name,label:p.label,fields:p.fields}))
);
export const pageFields=[text('slug','Page address — set once; lower-case words separated by hyphens'),text('title','Page title'),text('description','Page description'),{name:'collections',label:'Museum collections',kind:'relations',optional:true}, {name:'blocks',label:'Content blocks',kind:'blocks',hint:'Add a template, then move it into position. Start with Page introduction.'}];
export const collectionFields=[text('slug','Collection address — set once'),text('title','Collection title'),text('description','Description')];
const identifier=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function validateIdentifier(value) { if(typeof value!=='string'||value.length>80||!identifier.test(value)) throw Error('Use a short, lower-case address with hyphens between words.'); return value; }
export function validateLink(value){
 if(typeof value!=='string')throw Error('Supply a page address or HTTPS link.');
 if(/^#[a-zA-Z0-9_-]+$/.test(value))return value;
 if(value.startsWith('/')&&!value.startsWith('//')&&!/[\\<>\s]/.test(value))return value;
 return validateURL(value);
}
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
  if(f.kind==='text'||f.kind==='url'||f.kind==='select'||f.kind==='link'||f.kind==='reference'||f.kind==='manager'){
   if(typeof v!=='string'||(!f.optional&&!v.trim())||v.length>(f.kind==='text'?12000:2000))throw Error(`${p}: complete this field within its length limit.`);
   if(f.kind==='url')validateURL(v);
   if(f.kind==='link')validateLink(v);
   if(f.kind==='reference'||f.kind==='manager')validateIdentifier(v);
   if(f.kind==='select'&&!f.options.includes(v))throw Error(`${p}: choose a listed option.`);
  } else if(f.kind==='boolean'){if(typeof v!=='boolean')throw Error(`${p}: choose yes or no.`);}
  else if(f.kind==='list'){
   if(!Array.isArray(v)||v.length<f.min||v.length>f.max)throw Error(`${p}: check the number of entries.`);
   v.forEach((item,i)=>validateFields(item,f.fields,`${p}[${i}]`));
  } else if(f.kind==='relations'){
   if(!Array.isArray(v)||v.length>50||new Set(v).size!==v.length)throw Error(`${p}: choose distinct collections.`);
   v.forEach(validateIdentifier);
  } else if(f.kind==='blocks'||f.kind==='children'){
   if(!Array.isArray(v)||!v.length||v.length>50)throw Error(`${p}: add between one and fifty sections.`);
   v.forEach(item=>{if(f.kind==='children'&&!simpleTypes.includes(item.type))throw Error('Choose a supported column content block.');validateBlock(item);});
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
 if(block.type!=='intro'&&!patterns.some(p=>p.name===block.type))validateIdentifier(block.anchor);
 if(block.type==='facts'){
  block.facts.forEach(validateFact);
  if(!block.includeBlueVinyl&&!block.facts.length)throw Error('Add at least one fact.');
 }
 return block;
}
export function validatePage(page){
 validateFields(page,pageFields,'Page');page.collections??=[];validateIdentifier(page.slug);
 const reserved=['admin','assets','pages','collections','publication','version','index','templates','data','uploads','images','editor-preview'];
 if(reserved.includes(page.slug))throw Error('That page address is reserved.');
 const all=page.blocks.flatMap(b=>b.type==='section'?[b,...b.columns.flatMap(c=>c.blocks)]:[b]);
 if(all.some(b=>b.type==='results-ledger')!==all.some(b=>b.type==='results-div-2'))throw Error('Keep the results ledger and its source-status section together.');
 const heroes=all.filter(b=>b.type==='intro'||patterns.find(p=>p.name===b.type)?.hero);
 if(heroes.length!==1||heroes[0]!==page.blocks[0])throw Error('Start each page with one introduction.');
 const anchors=all.filter(b=>b.anchor).map(b=>b.anchor);
 if(new Set(anchors).size!==anchors.length)throw Error('Section addresses must be unique within a page.');
 for(const type of ['songbook','accounts','facts','museum'])if(all.filter(b=>b.type===type).length>1)throw Error(`Use one ${type} section per page.`);
 const ids=all.filter(b=>b.anchor&&b.type!=='museum').flatMap(b=>[b.anchor,`${b.anchor}-title`]);
 if(ids.some(id=>['main','song-list','song-filters','song-search','song-category','song-count','song-empty','show-all-songs','footage-1976'].includes(id)))throw Error('Section address conflicts with a built-in control.');
 if(new Set(ids).size!==ids.length)throw Error('Section addresses conflict with a heading address.');
 return page;
}
export function validateCollection(collection){validateFields(collection,collectionFields,'Collection');validateIdentifier(collection.slug);return collection;}
export function cmsField(f){
 const base={name:f.name,label:f.label,required:!f.optional,...(f.hint?{hint:f.hint}:{})};
 if(f.kind==='text')return {...base,widget:f.lines?'text':f.name==='text'||f.name==='deck'||f.name==='scope'||f.name==='conclusion'?'text':'string'};
 if(f.kind==='manager')return {...base,widget:'select',options:[],hint:'Choose a researched manager. Figures are calculated from the archive.'};
 if(f.kind==='reference')return {...base,widget:'relation',collection:f.collection,value_field:f.valueField,search_fields:[f.searchField],display_fields:[f.searchField]};
 if(f.kind==='link')return {...base,widget:'string',pattern:['^(https://|/($|[^/])|#[a-zA-Z0-9_-]+$)','Use an HTTPS link or a site-relative address.']};
 if(f.kind==='url')return {...base,widget:'string',pattern:['^https://','Use an HTTPS source link.']};
 if(f.kind==='select')return {...base,widget:'select',options:f.options};
 if(f.kind==='boolean')return {...base,widget:'boolean',default:false};
 if(f.kind==='list')return {...base,required:f.min>0&&!f.optional,widget:'list',collapsed:true,min:f.min,max:f.max,summary:f.name==='columns'?'Column — expand to edit content':'{{fields.title}}{{fields.label}}{{fields.text}}',fields:f.fields.map(cmsField),default:[]};
 if(f.kind==='relations')return {...base,widget:'relation',collection:'museum-collections',search_fields:['title'],value_field:'slug',display_fields:['title'],multiple:true,required:false,default:[]};
 if(f.kind==='blocks'||f.kind==='children')return {...base,widget:'list',collapsed:true,min:1,max:50,typeKey:'type',types:blockTypes.filter(t=>f.kind!=='children'||simpleTypes.includes(t.name)).map(t=>({name:t.name,label:t.label,widget:'object',summary:'{{fields.heading}}',fields:t.fields.map(cmsField)}))};
 throw Error('Unknown editor field.');
}
