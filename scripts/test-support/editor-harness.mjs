import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {editorOperation,EDITOR_PAGE} from '../../src/lib/editor-operations.mjs';
import {REPOSITORY} from '../../auth/mcp/github.mjs';
export const fixture=JSON.parse(await readFile(new URL('../../content/pages/component-preview-trial.json',import.meta.url),'utf8'));
export const MAIN='a'.repeat(40),HEAD='b'.repeat(40),MERGED='c'.repeat(40),token='unit_test_token_for_runtime_only';
export function harness(options={}){
 const calls=[];const page=structuredClone(fixture);page.blocks[0].heading='A saved inline heading';
 const fetcher=async(url,init={})=>{
  const path=new URL(url).pathname.replace(`/repos/${REPOSITORY}`,'');const method=init.method||'GET';calls.push({url,path,method,body:init.body&&JSON.parse(init.body)});
  assert(init.signal);assert.equal(init.redirect,'manual');
  if(url.startsWith('https://api.github.com/')){
   assert.equal(init.headers.Authorization,`Bearer ${token}`);
   if(method!=='GET'&&options.lost)throw Error(token);
   if(path==='')return Response.json({permissions:options.missing?{}:{push:!options.denied}});
   if(path==='/git/ref/heads/main')return Response.json({object:{sha:options.stale?HEAD:MAIN}});
   if(path==='/contents/content/pages/'+EDITOR_PAGE+'.json')return method==='PUT'?Response.json({commit:{sha:HEAD}}):Response.json({encoding:'base64',size:5000,sha:MAIN,content:Buffer.from(JSON.stringify(fixture)).toString('base64')});
   if(path==='/contents/content/collections')return Response.json([]);
   if(path==='/contents/content/photographs')return Response.json([{type:'file',name:'team-1888.json'}]);
   if(path==='/contents/content/managers')return Response.json([{type:'file',name:'darren-moore.json'}]);
   if(path==='/git/refs')return Response.json({});
   if(path==='/pulls')return Response.json(method==='POST'?{number:17,html_url:'https://github.com/'+REPOSITORY+'/pull/17'}:[{number:17,title:'Practice page',head:{ref:`cms/mcp/pages/${EDITOR_PAGE}/1234abcd`,sha:HEAD}},{number:18,title:'Other',head:{ref:'cms/mcp/pages/songs/1234abcd',sha:HEAD}}]);
   if(path==='/pulls/17')return Response.json({state:'open',changed_files:1,head:{sha:HEAD,ref:`cms/mcp/pages/${options.foreign?'songs':EDITOR_PAGE}/1234abcd`,repo:{full_name:REPOSITORY}},base:{ref:'main'}});
   if(path==='/pulls/17/files')return Response.json([{filename:`content/pages/${options.foreign?'songs':EDITOR_PAGE}.json`,status:'modified'}]);
   if(path==='/pulls/17/commits')return Response.json([{parents:[{sha:MAIN}]}]);
   if(path===`/commits/${HEAD}/status`)return Response.json({statuses:options.unchecked?[]:[{context:'albion/deploy-preview',state:'success',target_url:'https://1234abcd-throstle-and-stripes.steve-e85.workers.dev/'}]});
   if(path===`/commits/${HEAD}/check-runs`)return Response.json({check_runs:[{name:'Validate Songs page',status:'completed',conclusion:'success'}]});
   if(path==='/pulls/17/merge')return Response.json({merged:true,sha:MERGED});
   if(path===`/commits/${MERGED}/status`)return Response.json({statuses:[{context:'albion/production',state:'success'}]});
   throw Error('Unexpected fixed request '+path);
  }
  assert.equal(init.headers?.Authorization,undefined);
  return url.endsWith('/version.json')?Response.json({revision:url.includes('1234abcd-')?HEAD:options.live?MERGED:MAIN}):new Response(`<meta name="trial-revision" content="${HEAD}">`);
 };
 const call=async(data,extra={})=>editorOperation(new Request('https://museum.example/editor-api',{method:'POST',headers:{Origin:'https://museum.example','Content-Type':'application/json',Authorization:`Bearer ${token}`,...extra},body:JSON.stringify(data)}),fetcher);
 return{call,calls,page,fetcher};
}
