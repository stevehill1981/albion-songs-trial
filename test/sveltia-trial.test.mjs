import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadTrialPages,validateTrialPath,trialBreadcrumbs} from '../src/lib/sveltia-trial.mjs';
test('trial hierarchy preserves each sourced manager page and builds a real parent chain',async()=>{
 const pages=await loadTrialPages();
 for(const id of ['managers','darren-moore','steve-clarke','tony-mowbray']){
  const path=id==='managers'?id:'managers/'+id;const entry=pages.find(p=>p.path===path);assert(entry,'Missing copied page '+id);
  const original=JSON.parse(await readFile('content/pages/'+(id==='managers'?id:'manager-'+id)+'.json','utf8'));
  assert.deepEqual({...entry.page,slug:original.slug},original,'Prose, citations, blocks and performance IDs must be preserved.');
  const crumbs=trialBreadcrumbs(path,pages);assert.equal(crumbs[0].href,'/sveltia-trial/managers');assert.equal(crumbs.at(-1).href,'/sveltia-trial/'+path);
 }
 assert.equal(pages.length,4);
});
test('trial paths reject escaping, ambiguous folders and excessive depth',()=>{
 assert.equal(validateTrialPath('managers/darren-moore'),'managers/darren-moore');
 for(const path of ['../managers','managers/..','managers//x','managers/%2e%2e','managers/x?y','admin/x','managers/_private','managers/a/b/c/d'])assert.throws(()=>validateTrialPath(path));
});
test('missing parents, mismatched addresses and symbolic links cannot become trial pages',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'throstle-tree-test-'));
 try{
  const page=JSON.parse(await readFile('content/pages/manager-darren-moore.json','utf8'));page.slug='darren-moore';
  await mkdir(directory+'/managers/darren-moore',{recursive:true});await writeFile(directory+'/managers/darren-moore/index.json',JSON.stringify(page));
  await assert.rejects(loadTrialPages({directory}),/overview/);
  const overview={...page,slug:'managers'};await writeFile(directory+'/managers/index.json',JSON.stringify(overview));
  await loadTrialPages({directory});
  await writeFile(directory+'/managers/darren-moore/index.json',JSON.stringify({...page,slug:'wrong'}));await assert.rejects(loadTrialPages({directory}),/must agree/);
  await writeFile(directory+'/managers/darren-moore/index.json',JSON.stringify(page));await symlink(directory+'/managers/darren-moore',directory+'/managers/link');await assert.rejects(loadTrialPages({directory}),/symbolic links/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
