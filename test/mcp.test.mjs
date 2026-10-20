import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMuseumClient,recordPath,REPOSITORY,MAX_DOCUMENT_BYTES} from '../auth/mcp/github.mjs';
const MAIN='a'.repeat(40),HEAD='b'.repeat(40),MERGED='c'.repeat(40),NEXT='d'.repeat(40);
const token='unit_test_github_credential_only';
const fixture=JSON.parse(await readFile(new URL('../content/pages/component-preview-trial.json',import.meta.url),'utf8'));
const basePage=structuredClone(fixture);basePage.slug='museum-test';basePage.blocks[0].heading='Museum draft';
function harness(){
 const calls=[];let previewTarget="https://1234abcd-throstle-and-stripes.steve-e85.workers.dev",allowed=true,main=MAIN,head=HEAD,checked=true,published=MAIN,missingPreview=false,extraFile=false,merged=false,existing=null,managers=[{type:"file",name:"darren-moore.json"}];
 const pr=()=>({number:17,state:merged?'closed':'open',changed_files:extraFile?2:1,head:{sha:head,ref:'cms/mcp/pages/museum-test/1234abcd',repo:{full_name:REPOSITORY}},base:{ref:'main'}});
 const fetcher=async(url,init={})=>{
  calls.push({url,method:init.method||'GET',body:init.body?JSON.parse(init.body):null});
  if(url.startsWith('https://api.github.com/')){
   assert.equal(init.headers.Authorization,`Bearer ${token}`);assert.equal(init.redirect,'manual');
   const path=new URL(url).pathname.replace(`/repos/${REPOSITORY}`,'');const method=init.method||'GET';
   if(path==='')return Response.json({permissions:{push:allowed}});
   if(path==='/git/ref/heads/main')return Response.json({object:{sha:main}});
   if(path.startsWith('/git/ref/heads/cms/'))return Response.json({object:{sha:head}});
   if(path==='/contents/content/managers')return Response.json(managers);
   if(path==='/contents/content/collections')return Response.json([]);
   if(path==='/contents/content/photographs')return Response.json([{type:'file',name:'team-1888.json'}]);
   if(path==='/contents/content/pages/museum-test.json'){
    if(method==='PUT')return Response.json({commit:{sha:NEXT}});
    return existing?Response.json({size:100,encoding:'base64',sha:HEAD,content:Buffer.from(JSON.stringify(existing)).toString('base64')}):new Response('',{status:404});
   }
   if(path==='/git/refs')return Response.json({});
   if(path==='/pulls')return Response.json({number:17,html_url:'https://github.com/'+REPOSITORY+'/pull/17'});
   if(path==='/pulls/17')return Response.json(pr());
   if(path==='/pulls/17/files')return Response.json([{filename:'content/pages/museum-test.json',status:'added'},...(extraFile?[{filename:'package.json',status:'modified'}]:[])]);
   if(path==='/pulls/17/commits')return Response.json([{parents:[{sha:MAIN}]}]);
   if(path===`/commits/${HEAD}/status`)return Response.json({statuses:checked?[{context:'albion/deploy-preview',state:'success',target_url:previewTarget}]:[]});
   if(path===`/commits/${HEAD}/check-runs`)return Response.json({check_runs:checked?[{name:'Validate Songs page',status:'completed',conclusion:'success'}]:[]});
   if(path===`/commits/${MERGED}/status`)return Response.json({statuses:[{context:'albion/production',state:'success'}]});
   if(path==='/pulls/17/merge'){merged=true;return Response.json({merged:true,sha:MERGED});}
   throw Error('Unexpected GitHub path '+path);
  }
  assert.equal(init.headers?.Authorization,undefined,'Upstream credentials must never be sent to a preview URL');
  if(url.endsWith('/version.json'))return Response.json({revision:url.includes('1234abcd-')?HEAD:published});
  return missingPreview?new Response('missing',{status:404}):new Response(`<meta name="trial-revision" content="${HEAD}">`);
 };
 return{client:createMuseumClient(token,fetcher),calls,set(values){({previewTarget=previewTarget,allowed=allowed,main=main,head=head,checked=checked,published=published,missingPreview=missingPreview,extraFile=extraFile,existing=existing,managers=managers}=values);}};
}
test('museum tools fail closed on missing push access and never accept arbitrary repository paths',async()=>{
 const h=harness();h.set({allowed:false});await assert.rejects(h.client.save({kind:'pages',id:'museum-test',document:basePage,baseRevision:MAIN}),/editor access/);assert.equal(h.calls.length,1);
 for(const [kind,id]of [['pages','../secrets'],['data','results'],['pages','x/y']])assert.throws(()=>recordPath(kind,id));
 assert.throws(()=>createMuseumClient('invalid'));
});
test('draft validation rejects stale main, missing credits, unknown fields and unsafe source links before mutations',async()=>{
 const variants=[{baseRevision:HEAD},{document:{...basePage,unknown:true}},{kind:'photographs',document:{id:'museum-test'}},{document:{...basePage,collections:['missing']}},{document:{...basePage,title:'x'.repeat(MAX_DOCUMENT_BYTES)}},];
 const missing=structuredClone(basePage);missing.blocks[1].columns[1].blocks[0].photograph='missing';variants.push({document:missing});
 const unsafe=structuredClone(basePage);unsafe.blocks[0].caption=[{type:'link',text:'Unsafe',url:'javascript:alert(1)'}];variants.push({document:unsafe});
 for(const extra of variants){const h=harness();await assert.rejects(h.client.save({kind:'pages',id:'museum-test',document:basePage,baseRevision:MAIN,...extra}));assert(!h.calls.some(c=>c.method!=='GET'));}
});
test('a valid independent page draft uses only its fixed editorial path and the checked cms workflow',async()=>{
 const h=harness();const result=await h.client.save({kind:'pages',id:'museum-test',document:basePage,baseRevision:MAIN});assert.equal(result.state,'draft');assert.equal(result.commit,NEXT);
 const write=h.calls.find(c=>c.method==='PUT');assert.equal(new URL(write.url).pathname,`/repos/${REPOSITORY}/contents/content/pages/museum-test.json`);assert.match(write.body.branch,/^cms\/mcp\/pages\/museum-test\/[a-f0-9]{8}$/);assert.deepEqual(JSON.parse(Buffer.from(write.body.content,'base64').toString()),basePage);
 assert(h.calls.find(c=>c.method==='POST'&&new URL(c.url).pathname.endsWith('/pulls')));
 assert(!h.calls.some(c=>c.url.endsWith('/merge')));
});
test('publication rejects missing checks, stale commits, stale main, extra files, unserved previews and absent approval',async()=>{
 for(const values of [{checked:false},{head:NEXT},{main:NEXT},{missingPreview:true},{extraFile:true}]){const h=harness();h.set(values);await assert.rejects(h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'}));assert(!h.calls.some(c=>c.url.endsWith('/merge')));}
 const h=harness();await assert.rejects(h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:''}),/approve/);
});
test('preview, exact-commit merge and served publication form a complete sequence with negative live controls',async()=>{
 const h=harness();const preview=await h.client.status({draftNumber:17});assert.equal(preview.canPublish,true);assert.equal(preview.commit,HEAD);assert(preview.previewUrl.endsWith('/museum-test'));
 const merge=await h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'});assert.equal(merge.state,'publishing');assert.equal(merge.revision,MERGED);
 assert.equal((await h.client.publication({revision:MERGED})).state,'publishing','A green production status without the actual served revision is not live');h.set({published:MERGED});assert.equal((await h.client.publication({revision:MERGED})).state,'live');
 const put=h.calls.find(c=>c.url.endsWith('/merge'));assert.equal(put.body.sha,HEAD);
});
test('updating a draft refuses concurrent changes or unchanged content',async()=>{
 const h=harness();await assert.rejects(h.client.save({kind:'pages',id:'museum-test',document:basePage,baseRevision:MAIN,draftNumber:17,expectedCommit:NEXT}),/draft changed/);assert(!h.calls.some(c=>c.method!=='GET'));
 const same=harness();same.set({existing:basePage});await assert.rejects(same.client.save({kind:'pages',id:'museum-test',document:basePage,baseRevision:MAIN}),/content change/);assert(!same.calls.some(c=>c.method!=='GET'));
});

test('the actual MCP server exposes fourteen tools, validates inputs and invokes the museum operations',async()=>{
 const {createMuseumServer}=await import('../auth/mcp/server.mjs');
 const {Client}=await import('@modelcontextprotocol/client');
 const {InMemoryTransport}=await import('@modelcontextprotocol/server');
 const calls=[];
 const museum={guide:async()=>({instructions:'Read the checked preview before publishing.'}),list:async input=>{calls.push(input);return{ids:['songs'],revision:MAIN};},publish:async input=>{calls.push(input);return{state:'publishing',revision:MERGED};}};
 const server=createMuseumServer({client:museum});const client=new Client({name:'Museum protocol acceptance',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();
 try{
  await server.connect(a);await client.connect(b);
  const tools=await client.listTools();assert.equal(tools.tools.length,14);assert.equal(tools.tools.find(t=>t.name==='save_draft').annotations.readOnlyHint,false);assert(!tools.tools.some(t=>/shell|delete|deploy/.test(t.name)));
  const guide=await client.callTool({name:'museum_guide',arguments:{}});assert(!guide.isError);assert.equal(guide.structuredContent.instructions,'Read the checked preview before publishing.');
  const listed=await client.callTool({name:'list_content',arguments:{kind:'pages'}});assert(!listed.isError);assert.deepEqual(calls[0],{kind:'pages'});
  assert.equal((await client.callTool({name:'list_content',arguments:{kind:'data'}})).isError,true);assert.equal(calls.length,1);
  assert.equal((await client.callTool({name:'publish_draft',arguments:{draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Do whatever'}})).isError,true);assert.equal(calls.length,1);
  const published=await client.callTool({name:'publish_draft',arguments:{draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'}});assert.equal(published.structuredContent.state,'publishing');assert.equal(calls.length,2);
 }finally{await client.close();await server.close();}
});

test('reused schema metadata preserves defaults and keeps concurrent museum clients separate',async()=>{
 const {createMuseumServer}=await import('../auth/mcp/server.mjs');
 const {Client}=await import('@modelcontextprotocol/client');
 const {InMemoryTransport}=await import('@modelcontextprotocol/server');
 const connections=[];
 try{
  for(const owner of ['user_a','user_b']){
   const server=createMuseumServer({client:{drafts:async({page})=>({owner,page}),list:async({kind})=>({owner,kind})}});
   const client=new Client({name:owner,version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();
   connections.push({server,client});await server.connect(a);await client.connect(b);
  }
  const lists=await Promise.all(connections.map(({client})=>client.listTools()));
  assert.deepEqual(lists[0].tools,lists[1].tools,'Discovery contracts must stay identical across fresh servers');
  const results=await Promise.all(connections.map(({client})=>client.callTool({name:'list_drafts',arguments:{}})));
  assert.deepEqual(results.map(r=>r.structuredContent),[{owner:'user_a',page:1},{owner:'user_b',page:1}]);
  for(const {client}of connections){
   assert.equal((await client.callTool({name:'list_drafts',arguments:{page:0}})).isError,true);
   assert.equal((await client.callTool({name:'list_content',arguments:{kind:'unknown'}})).isError,true);
   assert.equal((await client.callTool({name:'list_content',arguments:{kind:'pages'}})).isError,undefined);
  }
 }finally{for(const {client,server}of connections){await client.close();await server.close();}}
});


test('performance drafts require a published manager and reject editable numbers before writes',async()=>{
 const document=structuredClone(basePage);document.blocks.push({type:'manager-performance',anchor:'performance',navLabel:'',heading:'Recorded results',manager:'darren-moore'});
 const allowed=harness();assert.equal((await allowed.client.save({kind:'pages',id:'museum-test',document,baseRevision:MAIN})).state,'draft');
 for(const managers of [[],{},[{type:'file',name:'different-person.json'}]]){const denied=harness();denied.set({managers});await assert.rejects(denied.client.save({kind:'pages',id:'museum-test',document,baseRevision:MAIN}),/manager/);assert(!denied.calls.some(c=>c.method!=='GET'));}
 const forged=structuredClone(document);forged.blocks.at(-1).played=999;const denied=harness();await assert.rejects(denied.client.save({kind:'pages',id:'museum-test',document:forged,baseRevision:MAIN}),/unexpected field/);assert(!denied.calls.some(c=>c.method!=='GET'));
});

test('concise guide and on-demand schemas retain all editable fields without mutable shared data',async()=>{
 const {authoringGuide,blockSchema}=await import('../auth/mcp/github.mjs');
 const {pageFields,collectionFields,blockTypes}=await import('../src/lib/blocks.mjs');
 const guide=authoringGuide();
 assert.deepEqual(guide.pageFields,pageFields);assert.deepEqual(guide.collectionFields,collectionFields);
 assert.deepEqual(guide.blockTypes.map(b=>b.name),blockTypes.map(b=>b.name));
 assert(Buffer.byteLength(JSON.stringify(guide))<8192,'Routine guidance must remain bounded');
 for(const original of blockTypes){const schema=blockSchema(original.name);assert.deepEqual(schema.block,original);assert(Buffer.byteLength(JSON.stringify(schema))<16384,'Fetch one bounded schema at a time');}
 assert.throws(()=>{blockSchema('intro').block.fields[0].name='changed';},TypeError);
 assert.throws(()=>{guide.blockTypes.push({name:'injected'});},TypeError);
 assert.throws(()=>blockSchema('missing'),/Choose a block/);
 assert.deepEqual(blockSchema('intro').block,blockTypes[0]);
 const denied=harness();denied.set({allowed:false});await assert.rejects(denied.client.schema({type:'intro'}),/access/);
});

test('lean protocol retains every exact-preview publication guard and served-revision confirmation',async()=>{
 const {createLeanMuseumServer}=await import('../auth/mcp/server.mjs');
 const {Client}=await import('@modelcontextprotocol/client');const {InMemoryTransport}=await import('@modelcontextprotocol/server');
 const publish={draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'};
 for(const values of [{checked:false},{head:NEXT},{main:NEXT},{missingPreview:true},{extraFile:true},{allowed:false},{}]){
  const h=harness();h.set(values);const server=createLeanMuseumServer({client:h.client}),client=new Client({name:'Lean publication acceptance',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
  try{
   await server.connect(a);await client.connect(b);
   const result=await client.callTool({name:'publish_draft',arguments:publish});
   if(Object.keys(values).length){assert.equal(result.isError,true);assert(!h.calls.some(c=>c.url.endsWith('/merge')));}
   else{
    assert.equal(result.structuredContent.state,'publishing');assert.equal(result.structuredContent.revision,MERGED);
    const queued=await client.callTool({name:'publication_status',arguments:{revision:MERGED}});assert.equal(queued.structuredContent.state,'publishing');
    h.set({published:MERGED});const live=await client.callTool({name:'publication_status',arguments:{revision:MERGED}});assert.equal(live.structuredContent.state,'live');
   }
  }finally{await client.close();await server.close();}
 }
});

// A passing status must never turn an arbitrary host into a trusted preview.
test('publication accepts only the named museum version host',async()=>{
 for(const previewTarget of [
  'https://1234abcd-albion-songs-trial.steve-e85.workers.dev',
  'https://1234abcd-throstle-and-stripes.steve-e85.workers.dev.evil.invalid',
  'https://1234abcd-throstle-and-stripes.other.workers.dev',
  'https://throstle-and-stripes.steve-e85.workers.dev',
  'http://1234abcd-throstle-and-stripes.steve-e85.workers.dev',
  'https://1234abcd-throstle-and-stripes.steve-e85.workers.dev/untrusted'
 ]){const h=harness();h.set({previewTarget});const result=await h.client.status({draftNumber:17});assert.equal(result.canPublish,false,previewTarget);assert.equal(result.previewOrigin,null);}
 const h=harness();assert.equal((await h.client.status({draftNumber:17})).canPublish,true);
});
