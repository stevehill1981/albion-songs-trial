import { copyFile, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { validateFact } from '../src/lib/fact.mjs';
import { loadContent } from '../src/lib/content.mjs';

validateFact(JSON.parse(await readFile('content/fact.json', 'utf8')));
await rm('.astro-server',{recursive:true,force:true});
await copyFile('node_modules/decap-cms/dist/decap-cms.js', 'public/admin/decap-cms.js');
await copyFile('src/lib/fact.mjs', 'public/admin/fact.mjs');
const pageTemplate=await readFile('test/fixtures/songs-before-blocks.html','utf8');
const marker=pageTemplate.indexOf('<!-- EDITABLE_FACT -->');
if(marker<0)throw Error('The editable fact marker is missing.');
const start=pageTemplate.lastIndexOf('<aside ',marker);
const end=pageTemplate.indexOf('</aside>',marker);
if(start<0 || end<0)throw Error('The fact section is missing.');
const previewTemplate=pageTemplate.slice(start,end+8)
  .replace(/<article class="fact-panel" data-fact>[\s\S]*?<\/article>/g,'')
  .replace(/<div class="fact-controls" hidden>[\s\S]*?<\/div>/,'')
  .replaceAll('src="assets/','src="/assets/');
await writeFile('public/admin/preview-template.json',JSON.stringify({html:previewTemplate})+'\n');
let revision = process.env.GITHUB_SHA;
if (!revision) {
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
  catch { revision = 'local-build'; }
}
await writeFile('public/version.json', JSON.stringify({revision}) + '\n');
const {buildMatchIndex}=await import('./build-match-index.mjs');
await buildMatchIndex({revision});
const site = JSON.parse(await readFile('site.json', 'utf8'));
const backend={name:'albion-github',repo:'stevehill1981/albion-songs-trial',branch:'main',auth_scope:'public_repo',base_url:site.authOrigin||'https://authentication-not-configured.invalid',auth_endpoint:'auth',preview_context:'albion/deploy-preview'};
const {pageFields,collectionFields,cmsField}=await import('../src/lib/blocks.mjs');
const {museumCollections}=await import('../src/lib/editor-schema.mjs');
const content=await loadContent();
await mkdir('src/generated',{recursive:true});
await writeFile('src/generated/component-context.json',JSON.stringify({revision,photographs:content.photographs,managerPerformance:content.managerPerformance}));
const fields=pageFields.map(cmsField);
fields.find(f=>f.name==='blocks').widget='layout-blocks';
fields.find(f=>f.name==='blocks').default=[{...content.pages.find(p=>p.slug==='songs').blocks[0],heading:'New page',emphasiseLastLine:false,text:'Add your introduction.',buttonLabel:''}];
const templateFields=pageFields.filter(f=>f.name!=='collections').map(cmsField);templateFields.find(f=>f.name==='blocks').widget='layout-blocks';
const config={backend,publish_mode:'editorial_workflow',site_url:site.origin,display_url:site.origin,media_folder:'public/uploads',public_folder:'/uploads',collections:[
 {name:'pages',label:'Pages',label_singular:'Page',folder:'content/pages',create:true,delete:false,format:'json',extension:'json',identifier_field:'slug',slug:'{{slug}}',preview_path:'{{slug}}',summary:'{{title}}',fields},
 {name:'page-templates',label:'Page templates',label_singular:'Page template',folder:'content/page-templates',create:true,delete:false,format:'json',extension:'json',identifier_field:'slug',slug:'{{slug}}',preview_path:'templates/{{slug}}',fields:templateFields},
 ...museumCollections(),
 {name:'museum-collections',label:'Museum collections',label_singular:'Museum collection',folder:'content/collections',create:true,delete:false,format:'json',extension:'json',identifier_field:'slug',slug:'{{slug}}',preview_path:'collections/{{slug}}',fields:collectionFields.map(cmsField)},
 {name:'songs',label:'Shared blue-vinyl fact',delete:false,files:[{name:'blue-vinyl',label:'Baggie Bird — Albion on blue vinyl',file:'content/fact.json',preview_path:'songs',fields:[{label:'Heading',name:'title',widget:'string'},{label:'Fact',name:'text',widget:'text'},{label:'Source link',name:'sourceURL',widget:'string',pattern:['^https://','Use an HTTPS source link.']},{label:'Source label',name:'sourceLabel',widget:'string'}]}]}
]};
function managerChoices(value){if(!value||typeof value!=='object')return;if(value.name==='manager'&&value.widget==='select')value.options=Object.values(content.managerPerformance.profiles).map(p=>({label:p.name,value:p.id}));for(const child of Object.values(value)){if(Array.isArray(child))child.forEach(managerChoices);else if(child&&typeof child==='object')managerChoices(child);}}
managerChoices(config);
await writeFile('public/admin/config.yml',JSON.stringify(config,null,2)+'\n');
await copyFile('src/lib/blocks.mjs','public/admin/blocks.mjs');
await copyFile('src/lib/layout-copy.mjs','public/admin/layout-copy.mjs');
for(const name of ['image-paths','image-library','component-preview','live-preview','manager-performance'])await copyFile(`src/lib/${name}.mjs`,`public/admin/${name}.mjs`);
await copyFile('src/lib/museum-patterns.json','public/admin/museum-patterns.json');
await writeFile('public/admin/preview-context.json',JSON.stringify({fact:content.fact,museumMarkup:content.museumMarkup,photoCredits:content.photoCredits,photographs:content.photographs,managerPerformance:content.managerPerformance}));
await writeFile('public/admin/layout-library.json',JSON.stringify([...content.templates.map(p=>({key:`template:${p.slug}`,kind:'Template',title:p.title,blocks:p.blocks})),...content.pages.map(p=>({key:`page:${p.slug}`,kind:'Page',title:p.title,blocks:p.blocks}))]));
const origin = site.origin || '';
await writeFile('public/publication.html',(await readFile('legacy/editing-guide.html','utf8')).replaceAll('{{ORIGIN}}',origin));
