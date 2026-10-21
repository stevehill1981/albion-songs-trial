import {localJSON} from '../studio/local-request.mjs';
import {storeFor} from '../studio/server-store.mjs';
export const prerender=false;
export async function POST({request}){
 if(!import.meta.env.DEV)return new Response('Local proof only',{status:403});
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 try{const body=await localJSON(request,import.meta.env.DEV);const fields={drafts:[],capture:['document'],open:['draftNumber'],status:['draftNumber'],publish:['draftNumber','expectedCommit','baseRevision','confirmation'],publication:['revision']};if(!body||!Object.hasOwn(fields,body.action)||Object.keys(body).some(k=>!['action','pageId',...fields[body.action]].includes(k))||body.pageId&&body.pageId!=='studio-proof')throw Error('Choose a supported site operation.');const store=storeFor(request),value=body.action==='capture'?await store.capture(body.document):await store.operation(body);return new Response(JSON.stringify(value),{headers});}catch(error){return new Response(JSON.stringify({error:{message:error.message,code:/revision changed/.test(error.message)?'conflict':'validation',uncertain:error.uncertain===true}}),{status:422,headers});}
}
