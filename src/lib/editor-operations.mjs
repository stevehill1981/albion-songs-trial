import {createMuseumClient,boundedText,MuseumError,REPOSITORY} from '../../auth/mcp/github.mjs';
import {validateComponentPage} from './component-preview.mjs';
export const EDITOR_PAGE='component-preview-trial';
const MAX_BYTES=68*1024;
const fields={read:[],drafts:['page'],open:['draftNumber'],save:['document','baseRevision','draftNumber','expectedCommit'],status:['draftNumber'],publish:['draftNumber','expectedCommit','baseRevision','confirmation'],publication:['revision']};
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const number=value=>Number.isSafeInteger(value)&&value>0;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const failure=(code,message,status,uncertain=false)=>reply({error:{code,message,uncertain}},status);
export async function editorOperation(request,fetcher=fetch){
 if(request.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return failure('origin','Open the editor on the museum address.',403);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return failure('format','Send one editor operation as JSON.',415);
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-zA-Z0-9_]{20,256})$/)?.[1];
 if(!token)return failure('signin','Connect GitHub to edit the museum.',401);
 const length=request.headers.get('Content-Length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES))return failure('size','This editor accepts up to 64 KB of page content.',413);
 let data;
 try{data=JSON.parse(await boundedText(request,MAX_BYTES));}catch{return failure('body','Send a complete editor operation within the content limit.',400);}
 if(!data||Array.isArray(data)||typeof data.action!=='string'||!Object.hasOwn(fields,data.action)||Object.keys(data).some(key=>key!=='action'&&!fields[data.action].includes(key)))return failure('operation','Choose a supported practice-page operation.',400);
 const {action,...args}=data;
 if(['open','status','publish'].includes(action)&&!number(args.draftNumber)||action==='drafts'&&(args.page!==undefined&&(!number(args.page)||args.page>100)))return failure('number','Choose a valid saved draft or draft-list page.',400);
 if(['save','publish'].includes(action)&&(!sha(args.baseRevision)||args.draftNumber!==undefined&&(!number(args.draftNumber)||!sha(args.expectedCommit)))||action==='publish'&&(!sha(args.expectedCommit)||args.confirmation!=='Publish this previewed revision')||action==='publication'&&!sha(args.revision))return failure('revision','Use the saved revision and check its preview before publishing.',400);
 if(action==='save'){
  try{if(new TextEncoder().encode(JSON.stringify(args.document)).byteLength>64*1024)throw Error();validateComponentPage(args.document);if(args.document.slug!==EDITOR_PAGE)throw Error();}catch{return failure('content','Complete the practice page’s supported fields before saving.',422);}
 }
 let mutationAttempted=false;
 const deadline=AbortSignal.timeout(30000);
 const client=createMuseumClient(token,async(url,options={})=>{
  if(String(url).startsWith(`https://api.github.com/repos/${REPOSITORY}/`)&&!['GET','HEAD'].includes(options.method||'GET'))mutationAttempted=true;
  return fetcher(url,{...options,signal:AbortSignal.any([deadline,request.signal,...(options.signal?[options.signal]:[])])});
 });
 try{
  if(args.draftNumber!==undefined){
   const status=await client.status({draftNumber:args.draftNumber,includeContent:action==='open'});
   if(status.kind!=='pages'||status.id!==EDITOR_PAGE)return failure('scope','Choose a saved draft of Build a page with Marie.',403);
   if(action==='open')return reply(status);
   if(action==='status')return reply(status);
  }
  if(action==='read')return reply(await client.read({kind:'pages',id:EDITOR_PAGE}));
  if(action==='drafts')return reply(await client.drafts({...args,kind:'pages',id:EDITOR_PAGE}));
  if(action==='save')return reply(await client.save({...args,kind:'pages',id:EDITOR_PAGE}));
  if(action==='publish')return reply(await client.publish(args));
  if(action==='publication')return reply(await client.publication(args));
  return failure('operation','Choose a supported practice-page operation.',400);
 }catch(error){
  // A lost response can follow a successful write. Never invite an automatic retry.
  if(mutationAttempted)return failure('uncertain','GitHub did not confirm the outcome. Keep your changes and reopen saved drafts to check; do not repeat the write.',503,true);
  if(error instanceof MuseumError){
   const denied=/access|Reconnect/.test(error.message),conflict=/changed|revision|overwrite/.test(error.message);
   return failure(denied?'access':conflict?'conflict':'validation',error.message,denied?403:conflict?409:422);
  }
  return failure('unavailable','The operation could not be checked. Your local changes are still here. Try a read again shortly.',503);
 }
}
