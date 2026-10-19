import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadContent,publicPage} from '../src/lib/content.mjs';

test('museum edits reach rendered stories while missing evidence, eras and preserved pages fail',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'albion-museum-check-'));
 try{
  await Promise.all(['content','legacy','site.json'].map(name=>cp(name,join(dir,name),{recursive:true})));
  await cp('public',join(dir,'public'),{recursive:true});
  const root=pathToFileURL(dir+'/');
  const file=join(dir,'content/exhibits/jeff-astle.json');const original=JSON.parse(await readFile(file,'utf8'));
  const edited={...original,body:['A new sourced paragraph with <angle brackets>.',...original.body.slice(1)]};
  await writeFile(file,JSON.stringify(edited));
  const content=await loadContent({root});const home=content.pages.find(p=>p.slug==='home');
  assert(publicPage(content,home,'check').includes('A new sourced paragraph with &lt;angle brackets&gt;.'));
  await writeFile(file,JSON.stringify({...edited,sources:['missing-source']}));await assert.rejects(loadContent({root}),/Unknown source/);
  await writeFile(file,JSON.stringify({...edited,era:'missing-era'}));await assert.rejects(loadContent({root}),/Unknown exhibit era/);
  await writeFile(file,JSON.stringify(original));await rm(join(dir,'content/pages/home.json'));
  await assert.rejects(loadContent({root}),/All five preserved museum pages/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
