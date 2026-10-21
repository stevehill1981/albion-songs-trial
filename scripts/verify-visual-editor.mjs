import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {renderPageContent} from '../src/lib/blocks.mjs';
export async function verifyVisualEditor({html,context,source,readAsset}={}){
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
 assert(html.includes('Nothing here saves or publishes'));
 assert(!html.includes('data-editor-block='),'Editor markers must be added only to the isolated preview document.');
 return{page:data.page,script};
}
export async function verifyVisualEditorBuild(){
 const options={html:await readFile('build/editor-lab.html','utf8'),context:JSON.parse(await readFile('src/generated/component-context.json','utf8')),source:JSON.parse(await readFile('content/pages/manager-darren-moore.json','utf8')),readAsset:path=>readFile('build'+path,'utf8')};
 await verifyVisualEditor(options);
 // The heading in the editor chrome is not the source: corrupt the actual JSON.
 const broken=options.html.replace('"heading":"Darren Moore"','"heading":"Altered practice name"');
 assert.notEqual(broken,options.html,'Negative control must change the seeded page.');
 await assert.rejects(()=>verifyVisualEditor({...options,html:broken}));
 console.log('PASS: isolated visual editor preserves its manager source, exact Astro markup, stylesheets and credential boundaries; corrupted seed rejected.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await verifyVisualEditorBuild();
