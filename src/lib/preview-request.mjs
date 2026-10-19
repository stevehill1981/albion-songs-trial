import {validateComponentPage} from './component-preview.mjs';
export const MAX_PREVIEW_BYTES=64*1024;
const fail=(text,status,extra={})=>({response:new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}})});
export async function preparePreviewRequest(request,fetcher=fetch,photographs){
 if(request.method!=='POST')return fail('Use the editor to request a preview.',405,{Allow:'POST'});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return fail('Unrecognised editor origin.',403);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return fail('Send draft content as JSON.',415);
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-zA-Z0-9_]{20,256})$/)?.[1];
 if(!token)return fail('Sign in with GitHub to preview Astro components.',401);
 const declared=request.headers.get('Content-Length');
 if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_PREVIEW_BYTES))return fail('This trial previews up to 64 KB of content.',413);
 try{
  const access=await fetcher('https://api.github.com/repos/stevehill1981/albion-songs-trial',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'Albion component preview','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(5000),redirect:'manual'});
  if(access.status===401)return fail('Your GitHub sign-in has expired. Sign in again.',401);
  if(!access.ok)return fail('GitHub access could not be checked. Try previewing again shortly.',503);
  if((await access.json()).permissions?.push!==true)return fail('This GitHub account does not have museum editor access.',403);
 }catch{return fail('GitHub access could not be checked. Try previewing again shortly.',503);}
 let body='';let size=0;const reader=request.body?.getReader();
 if(!reader)return fail('Draft content is missing.',400);
 try{
  const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_PREVIEW_BYTES){await reader.cancel();return fail('This trial previews up to 64 KB of content.',413);}body+=decoder.decode(value,{stream:true});}
  body+=decoder.decode();
  const data=JSON.parse(body);if(!data||Object.keys(data).length!==1||!Object.hasOwn(data,'page'))return fail('Send one page to preview.',400);
  const page=validateComponentPage(data.page);
  if(photographs){const all=page.blocks.flatMap(b=>b.type==='section'?b.columns.flatMap(c=>c.blocks):[b]);if(all.some(b=>b.type==='photograph'&&!Object.hasOwn(photographs,b.photograph)))return fail('Choose a published photograph from the credited library.',422);}
  return{page};
 }catch{return fail('Complete the required fields to update the Astro preview.',422);}
 finally{reader.releaseLock();}
}
