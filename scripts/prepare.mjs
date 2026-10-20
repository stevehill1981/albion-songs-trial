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
await writeFile('public/publication.html', `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Publishing the Albion museum</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/albion.css"><main class="wrap section"><h1>Publishing the Albion museum</h1><p><a href="/admin/">Open the editor</a> · <a href="/pages">Explore pages and collections</a> · <a href="/component-preview-trial">Try the Astro component page</a></p><ol><li>Sign in with your own GitHub login.</li><li>Open Pages to edit any museum page or create a new page. Use Page templates to save a copied layout under a name; apply a published template with the Content blocks controls. Sections support one to three columns, Albion backgrounds and spacing choices. Add and order content templates, choose museum collections, and save a draft. Start with one Page introduction. Use lower-case page and section addresses separated by hyphens; set the page address once.</li><li>Wait for View preview. Open it and check the whole page, its sources and its collection links. After another save, an older preview link can remain temporarily: reload the saved editor entry after checks finish and confirm your latest wording appears. Introductions, text, photographs, manager performance and their columns preview through Astro before saving. Choose a researched manager in a performance block; its figures and spell sources are calculated and cannot be typed over. Incomplete fields keep the last successful preview visible. Other blocks retain their existing inline previews; use View preview to test search and rotating facts.</li><li>Use the editor’s workflow to mark it ready and publish. Required checks must pass first.</li><li>Wait for publication below, then open the public page. If a check fails, the previous published page stays live.</li></ol><p>To add an image, open Photographs and credits → New. Upload from its Image field, add the description and credits, then save, preview and publish the photograph. Choose the published record in a page, exhibit or era after refreshing the editor. <a href="/images">Browse the image library</a>. JPEG, PNG and WebP: up to 5 MB each; dimensions are detected automatically. Use a new filename for a replacement.</p><p>For conversational editing in Claude, the owner can enable the Albion museum connector. Add it in Claude’s Connectors settings and sign in with your GitHub account. It can prepare pages, layouts and collection drafts, show their checked previews, and publish when you ask. <a href="https://github.com/stevehill1981/albion-songs-trial#managing-the-museum-from-claude">Connector setup and guide</a>.</p><p>To undo a change, edit the previous wording back in the editor, preview and publish again. GitHub retains previous versions if you need to recover the text.</p><p id="publication-status" role="status">Checking publication status…</p><p><a href="https://github.com/stevehill1981/albion-songs-trial/actions">View build details on GitHub</a></p><p>This is an editing trial. <a href="https://maries-albion-scrapbook.stevehill1981.chatgpt.site/songs">Visit the existing museum.</a></p></main><script type="module">const status=document.querySelector('#publication-status');try{const [live,branch]=await Promise.all([fetch('${origin}/version.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('https://api.github.com/repos/stevehill1981/albion-songs-trial/commits/main',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()})]);status.textContent=live.revision===branch.sha?'The latest published revision is live.':'A newer revision is waiting to publish or needs attention. Check the build details below.';}catch{status.textContent='Publication status is unavailable. Check the public page and build details before assuming a change is live.'}</script></html>`);
