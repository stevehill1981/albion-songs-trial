import{test}from'node:test';
import assert from'node:assert/strict';
import{mkdtemp,mkdir,readFile,writeFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{pathToFileURL}from'node:url';
import{loadContent,publicPage,renderListing}from'../src/lib/content.mjs';
test('new page membership, stable paths and missing collection failures are checked from files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'albion-content-'));
 try{
  for(const path of ['content/pages','content/collections','legacy'])await mkdir(join(dir,path),{recursive:true});
  await writeFile(join(dir,'content/pages/songs.json'),await readFile('test/fixtures/songs-initial.json'));
  await writeFile(join(dir,'content/collections/terrace-culture.json'),JSON.stringify({slug:'terrace-culture',title:'Terrace culture',description:'Supporter traditions'}));
  for(const file of ['content/fact.json','legacy/shell.html'])await writeFile(join(dir,file),await readFile(file));
  const root=pathToFileURL(dir+'/');const c=await loadContent({root});
  const page=structuredClone(c.pages[0]);page.slug='new-page';page.title='New page';page.blocks=[page.blocks[0]];
  await writeFile(join(dir,'content/pages/new-page.json'),JSON.stringify(page));
  const loaded=await loadContent({root});assert.equal(loaded.pages.length,2);
  assert(publicPage(loaded,page,'revision').includes('href="/collections/terrace-culture"'));
  assert(renderListing(c.shell,{title:'Collection',description:'Pages',items:loaded.pages.map(p=>({...p,href:`/${p.slug}`})),revision:'revision'}).includes('href="/new-page"'));
  await rm(join(dir,'content/collections/terrace-culture.json'));await assert.rejects(loadContent({root}),/Unknown museum collection/);
  page.slug='another-page';await writeFile(join(dir,'content/pages/new-page.json'),JSON.stringify(page));await assert.rejects(loadContent({root}),/filename and stable address/);
 }finally{await rm(dir,{recursive:true});}
});
