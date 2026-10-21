import {draftSnapshot} from '../scripts/test-support/draft-snapshot.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMuseumClient,recordPath,REPOSITORY,MAX_DOCUMENT_BYTES} from '../auth/mcp/github.mjs';
const MAIN='a'.repeat(40),HEAD='b'.repeat(40),MERGED='c'.repeat(40),NEXT='d'.repeat(40);
const token='unit_test_github_credential_only';
const fixture=JSON.parse(await readFile(new URL('../content/pages/component-preview-trial.json',import.meta.url),'utf8'));
const basePage=structuredClone(fixture);basePage.slug='museum-test';basePage.blocks[0].heading='Museum draft';
function harness(){
 let transformSnapshot=value=>value;
 const calls=[];let previewTarget="https://1234abcd-throstle-and-stripes.steve-e85.workers.dev",allowed=true,main=MAIN,head=HEAD,checked=true,published=MAIN,missingPreview=false,extraFile=false,merged=false,existing=null,managers=[{type:"file",name:"darren-moore.json"}];
 const pr=()=>({number:17,state:merged?'closed':'open',changed_files:extraFile?2:1,head:{sha:head,ref:'cms/mcp/pages/museum-test/1234abcd',repo:{full_name:REPOSITORY}},base:{ref:'main'}});
 const fetcher=async(url,init={})=>{
  calls.push({url,method:init.method||'GET',body:init.body?JSON.parse(init.body):null});
  if(url.startsWith('https://api.github.com/')){
   assert.equal(init.headers.Authorization,`Bearer ${token}`);assert.equal(init.redirect,'manual');
   const path=new URL(url).pathname.replace(`/repos/${REPOSITORY}`,'');const method=init.method||'GET';
   if(path==='/graphql'){
    assert.equal(method,'POST');const body=JSON.parse(init.body);assert.match(body.query,/^query MuseumDraft/);assert.deepEqual(body.variables,{number:17});
    return Response.json(transformSnapshot(draftSnapshot({repository:{permissions:{push:allowed}},main,head,pr:pr(),files:[{filename:'content/pages/museum-test.json',status:'added'},...(extraFile?[{filename:'package.json',status:'modified'}]:[])],checked,previewTarget})));
   }
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
 return{client:createMuseumClient(token,fetcher),calls,transformSnapshot(fn){transformSnapshot=fn;},set(values){({previewTarget=previewTarget,allowed=allowed,main=main,head=head,checked=checked,published=published,missingPreview=missingPreview,extraFile=extraFile,existing=existing,managers=managers}=values);}};
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

test('record byte decoding preserves multilingual content and rejects malformed source encoding',async()=>{
 const document=structuredClone(fixture);document.title='Marie’s Albion — café, 日本語 and ⚽';
 const bytes=Buffer.from(JSON.stringify(document),'utf8');
 const clientFor=(content,size=bytes.length)=>createMuseumClient(token,async(url,options)=>{
  assert.equal(options.method,'GET');
  const path=new URL(url).pathname.replace(`/repos/${REPOSITORY}`,'');
  if(path==='')return Response.json({permissions:{push:true}});
  if(path==='/git/ref/heads/main')return Response.json({object:{sha:MAIN}});
  assert.equal(path,'/contents/content/pages/component-preview-trial.json');
  return Response.json({encoding:'base64',size,sha:HEAD,content});
 });
 const wrapped=bytes.toString('base64').match(/.{1,60}/g).join('\n');
 assert.deepEqual((await clientFor(wrapped).read({kind:'pages',id:'component-preview-trial'})).document,document);
 for(const content of ['@@@@',Buffer.from([0xc3,0x28]).toString('base64'),Buffer.from([0xc0,0x80]).toString('base64')])await assert.rejects(()=>clientFor(content).read({kind:'pages',id:'component-preview-trial'}));
 await assert.rejects(()=>clientFor(wrapped,MAX_DOCUMENT_BYTES+1).read({kind:'pages',id:'component-preview-trial'}));
});

test('combined draft lookup rejects partial data, truncated scope and mismatched heads before publication',async t=>{
 const cases={
  'GraphQL error with otherwise complete data':value=>{value.errors=[{message:'private upstream detail'}];},
  'missing repository':value=>{value.data.repository=null;},
  'unknown permission':value=>{value.data.repository.viewerPermission=null;},
  'read-only permission':value=>{value.data.repository.viewerPermission='READ';},
  'missing main revision':value=>{value.data.repository.ref=null;},
  'missing merge state':value=>{delete value.data.repository.pullRequest.merged;},
  'inconsistent merge state':value=>{value.data.repository.pullRequest.merged=true;},
  'missing pull request':value=>{value.data.repository.pullRequest=null;},
  'truncated files':value=>{value.data.repository.pullRequest.files.pageInfo.hasNextPage=true;},
  'missing file connection':value=>{value.data.repository.pullRequest.files=null;},
  'renamed content':value=>{value.data.repository.pullRequest.files.nodes[0].changeType='RENAMED';},
  'foreign content':value=>{value.data.repository.pullRequest.files.nodes[0].path='package.json';},
  'foreign repository':value=>{value.data.repository.pullRequest.headRepository.nameWithOwner='user_a/other';},
  'foreign base branch':value=>{value.data.repository.pullRequest.baseRefName='other';},
  'truncated commits':value=>{value.data.repository.pullRequest.history.pageInfo.hasNextPage=true;},
  'empty history':value=>{value.data.repository.pullRequest.history.nodes=[];},
  '100 commits':value=>{const h=value.data.repository.pullRequest.history;h.nodes=Array.from({length:100},()=>h.nodes[0]);},
  'merge as initial commit':value=>{value.data.repository.pullRequest.history.nodes[0].commit.parents.nodes.push({oid:NEXT});},
  'truncated parents':value=>{value.data.repository.pullRequest.history.nodes[0].commit.parents.pageInfo.hasNextPage=true;},
  'malformed base':value=>{value.data.repository.pullRequest.history.nodes[0].commit.parents.nodes[0].oid='invalid';},
  'history head disagreement':value=>{value.data.repository.pullRequest.history.nodes[0].commit.oid=NEXT;},
  'check commit disagreement':value=>{value.data.repository.pullRequest.latest.nodes[0].commit.oid=NEXT;},
  'missing latest commit':value=>{value.data.repository.pullRequest.latest.nodes=[];},
  'truncated checks':value=>{value.data.repository.pullRequest.latest.nodes[0].commit.statusCheckRollup.contexts.pageInfo.hasNextPage=true;},
 };
 for(const [name,change]of Object.entries(cases))await t.test(name,async()=>{
  const h=harness();h.transformSnapshot(value=>{change(value);return value;});
  await assert.rejects(h.client.status({draftNumber:17}));
  await assert.rejects(h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'}));
  assert(h.calls.every(call=>call.url==='https://api.github.com/graphql'),'Rejected metadata must not trigger writes or public preview reads');
 });
});
test('combined lookup uses fresh permission, bounded fixed reads and unchanged status fields',async()=>{
 const h=harness();const status=await h.client.status({draftNumber:17});
 assert.deepEqual(status,{draftNumber:17,kind:'pages',id:'museum-test',state:'open',commit:HEAD,baseRevision:MAIN,checksPassed:true,previewOrigin:'https://1234abcd-throstle-and-stripes.steve-e85.workers.dev',validation:'success',deployment:'success',previewVerified:true,previewUrl:'https://1234abcd-throstle-and-stripes.steve-e85.workers.dev/museum-test',publicUrl:'https://throstle-and-stripes.steve-e85.workers.dev/museum-test',canPublish:true});
 assert.equal(h.calls.length,3,'One GitHub snapshot plus two independently served preview checks');
 h.set({allowed:false});await assert.rejects(h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'}),/access/);
 assert.equal(h.calls.length,4);assert(!h.calls.some(call=>call.url.endsWith('/merge')));
 const query=h.calls[0].body.query;assert(!/mutation|\$owner|\$repo/.test(query));
 for(const permission of ['WRITE','MAINTAIN','ADMIN']){const owner=harness();owner.transformSnapshot(value=>{value.data.repository.viewerPermission=permission;return value;});assert.equal((await owner.client.status({draftNumber:17})).canPublish,true);}
});
test('missing checks and newer reruns cannot inherit an older successful preview',async()=>{
 for(const kind of ['null','missing','pending-build','pending-deploy','ambiguous','invalid-time']){
  const h=harness();h.transformSnapshot(value=>{
   const commit=value.data.repository.pullRequest.latest.nodes[0].commit,contexts=commit.statusCheckRollup.contexts;
   if(kind==='null')commit.statusCheckRollup=null;
   else if(kind==='missing')contexts.nodes=[];
   else{
    const old=contexts.nodes[kind==='pending-deploy'?0:1],rerun={...old,createdAt:'2026-10-21T11:00:00Z',startedAt:kind==='ambiguous'?old.startedAt:kind==='invalid-time'?'invalid':'2026-10-21T11:00:00Z',state:'PENDING',status:'IN_PROGRESS',conclusion:null};
    contexts.nodes.push(rerun);
   }return value;
  });
  if(['ambiguous','invalid-time'].includes(kind))await assert.rejects(h.client.status({draftNumber:17}));
  else assert.equal((await h.client.status({draftNumber:17})).canPublish,false);
  await assert.rejects(h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'}));
  assert(!h.calls.some(call=>call.url.endsWith('/merge')));
 }
});

test('merged draft status retains its exact publication revision and cannot publish again',async()=>{
 const h=harness();h.transformSnapshot(value=>{const pr=value.data.repository.pullRequest;pr.state='MERGED';pr.merged=true;pr.mergeCommit={oid:MERGED};return value;});
 const result=await h.client.status({draftNumber:17});assert.equal(result.state,'closed');assert.equal(result.publicationRevision,MERGED);assert.equal(result.canPublish,false);
 await assert.rejects(h.client.publish({draftNumber:17,expectedCommit:HEAD,baseRevision:MAIN,confirmation:'Publish this previewed revision'}));assert(!h.calls.some(c=>c.url.endsWith('/merge')));
});
test('GitHub snapshot HTTP failures and oversized responses stop without leaking upstream details',async()=>{
 for(const response of [new Response(token,{status:403}),new Response(JSON.stringify({errors:[{message:token}]})),new Response('x'.repeat(2*1024*1024+1))]){
  let calls=0;const client=createMuseumClient(token,async(url,init)=>{calls++;assert.equal(url,'https://api.github.com/graphql');assert.equal(init.method,'POST');assert(init.signal);return response;});
  await assert.rejects(client.status({draftNumber:17}),error=>!error.message.includes(token));assert.equal(calls,1);
 }
});
