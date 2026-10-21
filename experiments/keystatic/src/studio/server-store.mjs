import {createLocalStore} from './local-store.mjs';
// Only local DEV routes call this adapter. No GitHub credential or hosted fallback.
const stores=new Map();
export function storeFor(request){const origin=new URL(request.url).origin;if(stores.has(origin))return stores.get(origin);const store=createLocalStore({root:process.cwd(),renderSnapshot:async workspace=>{
 const result=[];for(const page of workspace.pages){const response=await fetch(origin+'/studio-preview',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({workspace,pageId:page.id}),signal:AbortSignal.timeout(10000)});if(!response.ok||response.headers.get('X-Studio-Renderer')!=='astro-components')throw Error('The actual Astro preview could not be verified.');result.push(await response.text());}return result;
 }});stores.set(origin,store);return store;}
