import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {EDITOR_PAGES} from '../src/lib/editor-pages.mjs';
import {validateComponentPage} from '../src/lib/component-preview.mjs';
import {renderPageContent} from '../src/lib/blocks.mjs';
export async function verifyVisualEditor({html,context,source,readAsset,workflow=false}={}){
 const data=JSON.parse(html.match(/<script id="visual-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
 assert(data?.page,'The editor practice seed is missing.');
 assert.deepEqual(data.page.blocks.slice(0,source.blocks.length),source.blocks,'The practice seed changed historical content or credits.');
 assert.deepEqual(data.page.collections,source.collections);
 const initial=html.match(/<template id="initial-render">([\s\S]*?)<\/template>/)?.[1];
 const norm=value=>value.replace(/\s+/g,' ').trim();
 assert.equal(norm(initial||''),norm(renderPageContent(data.page,context)),'The seeded preview differs from the published Astro contract.');
 const script=html.match(/<script type="module" src="([^"]+)"/)[1];
 assert(script.startsWith('/_astro/'));const client=await readAsset(script);
 for(const stylesheet of ['/styles.css','/museum.css','/albion.css','/songs.css','/layout.css'])assert(client.includes(stylesheet),'Missing page stylesheet: '+stylesheet);
 assert(client.includes('/editor-preview'),'The actual Astro preview route is missing.');
 assert(!client.includes('localStorage')&&!client.includes('sessionStorage'),'Do not persist the sign-in credential.');
 assert(html.includes('sandbox="allow-same-origin"')&&!html.includes('allow-scripts'));
 assert.equal(data.workflow,workflow);
 if(workflow){
  assert.deepEqual(data.pages.map(page=>page.id),EDITOR_PAGES,'The page chooser must match the endpoint rollout boundary.');
  for(const item of data.pages){const source=validateComponentPage(JSON.parse(await readFile(new URL(`../content/pages/${item.id}.json`,import.meta.url),'utf8')));assert.equal(item.title,source.title);assert(html.includes(`<option value="${item.id}">`),'A supported page is absent from the chooser.');}
  assert.deepEqual(data.page,source,'The saving editor must seed the real practice page losslessly.');
  for(const id of ['save-draft','open-drafts','check-draft','saved-preview','publish-draft'])assert(html.includes(`id="${id}"`),'Missing workflow control: '+id);
  assert(html.includes('id="fields" onsubmit="return false" inert'),'Editing must wait for a fresh authenticated read.');
  assert(client.includes('/editor-api'),'The bounded publishing adapter is missing.');
 }else{assert(html.includes('Nothing here saves or publishes'));assert(!html.includes('id="save-draft"'));}
 assert(!html.includes('data-editor-block='),'Editor markers must be added only to the isolated preview document.');
 return{page:data.page,script};
}
export async function verifyVisualEditorBuild(){
 const options={html:await readFile('build/editor-lab.html','utf8'),context:JSON.parse(await readFile('src/generated/component-context.json','utf8')),source:JSON.parse(await readFile('content/pages/manager-darren-moore.json','utf8')),readAsset:path=>readFile('build'+path,'utf8')};
 await verifyVisualEditor(options);
 const editor={...options,workflow:true,html:await readFile('build/editor.html','utf8'),source:JSON.parse(await readFile('content/pages/component-preview-trial.json','utf8'))};
 await verifyVisualEditor(editor);
 const missingPage=editor.html.replace('<option value="managers">','<option value="missing">');
 assert.notEqual(missingPage,editor.html);await assert.rejects(()=>verifyVisualEditor({...editor,html:missingPage}));
 const enabled=editor.html.replace('onsubmit="return false" inert','onsubmit="return false"');
 assert.notEqual(enabled,editor.html);await assert.rejects(()=>verifyVisualEditor({...editor,html:enabled}));
 // The heading in the editor chrome is not the source: corrupt the actual JSON.
 const broken=options.html.replace('"heading":"Darren Moore"','"heading":"Altered practice name"');
 assert.notEqual(broken,options.html,'Negative control must change the seeded page.');
 await assert.rejects(()=>verifyVisualEditor({...options,html:broken}));
 console.log('PASS: isolated visual editor preserves its manager source, exact Astro markup, stylesheets and credential boundaries; corrupted seed and premature editing rejected.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await verifyVisualEditorBuild();
