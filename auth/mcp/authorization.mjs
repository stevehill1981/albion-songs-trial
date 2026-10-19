import {AuthorizationError,CimdFetchError,authorizationErrorRedirect} from '@cloudflare/workers-oauth-provider';
import {handle as decap} from '../worker.mjs';
import {createMuseumClient,REPOSITORY,boundedText} from './github.mjs';
export const MCP_SCOPE='museum:manage';
export const AUTH_ORIGIN='https://albion-songs-auth.steve-e85.workers.dev';
const escape=value=>String(value).replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const failure=(message,status=400)=>new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
function consentPage(details,handle){
 return `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connect Marie’s Albion museum</title><h1>Connect ${escape(details.clientName)} to the Albion museum?</h1><p>${details.clientDomain?`Client identity published by ${escape(details.clientDomain)}.`:'This client supplied its own name; the name has not been verified.'} Access returns to <strong>${escape(details.redirectHost)}</strong>.</p>${details.redirectIsLoopback?'<p>This returns access to an app on your computer. Continue only if you started this connection.</p>':''}<p>After signing in with GitHub, this connection can read museum content, save page, layout and collection drafts, and publish drafts that pass the museum’s checks when you ask it to.</p><p>It uses only the Albion trial repository. Match archives, site code and Cloudflare account settings are outside these tools. Your GitHub password and GitHub access token are not sent to the assistant.</p><form method="post" action="/authorize"><input type="hidden" name="handle" value="${escape(handle)}"><button name="decision" value="approve">Connect with GitHub</button> <button name="decision" value="deny">Cancel</button></form></html>`;
}
export async function handleAuthorization(request,env,{fetcher=fetch}={}){
 const url=new URL(request.url),oauth=env.OAUTH_PROVIDER;
 if(url.pathname!=='/authorize'&&!(url.pathname==='/callback'&&url.searchParams.get('state')?.startsWith('mcp_')))return decap(request,env,fetcher);
 if(url.origin!==AUTH_ORIGIN||!oauth||!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return failure('Museum connection is not configured.',503);
 try{
  if(url.pathname==='/authorize'){
   if(request.method==='GET'){
    const authRequest=await oauth.parseAuthRequest(request);
    if(authRequest.scope.some(s=>s!==MCP_SCOPE))return failure('Unsupported museum permission.');
    const details=await oauth.describeConsent(authRequest);const consent=await oauth.beginConsent(authRequest);
    consent.headers.set('Content-Security-Policy',"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");consent.headers.set('Content-Type','text/html; charset=utf-8');consent.headers.set('Referrer-Policy','no-referrer');consent.headers.set('X-Content-Type-Options','nosniff');
    return new Response(consentPage(details,consent.handle),{headers:consent.headers});
   }
   if(request.method!=='POST')return failure('Use the connection consent form.',405);
   if(request.headers.get('Origin')!==AUTH_ORIGIN)return failure('The consent form origin could not be verified.',403);
   const form=await request.formData();const handle=String(form.get('handle')||'');
   if(form.get('decision')!=='approve'){const denied=await oauth.denyConsent(request,handle);return new Response(null,{status:302,headers:denied.headers});}
   const approved=await oauth.approveConsent(request,handle,{scope:[MCP_SCOPE]});
   const verifier=crypto.randomUUID()+crypto.randomUUID();const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
   const challenge=btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   const upstream=await oauth.beginUpstream(approved.request,{data:{verifier},headers:approved.headers});
   const github=new URL('https://github.com/login/oauth/authorize');
   for(const [key,value]of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:AUTH_ORIGIN+'/callback',scope:'public_repo',state:'mcp_'+upstream.state,code_challenge:challenge,code_challenge_method:'S256'}))github.searchParams.set(key,value);
   upstream.headers.set('Location',github.href);upstream.headers.set('Referrer-Policy','no-referrer');return new Response(null,{status:302,headers:upstream.headers});
  }
  if(request.method!=='GET')return failure('Use the GitHub sign-in callback.',405);
  const resumedURL=new URL(url);resumedURL.searchParams.set('state',url.searchParams.get('state').slice(4));
  const resumed=await oauth.finishUpstream(new Request(resumedURL,request));
  if(url.searchParams.has('error')||!url.searchParams.get('code')){resumed.headers.set('Location',authorizationErrorRedirect(resumed.request,'access_denied'));return new Response(null,{status:302,headers:resumed.headers});}
  if(typeof resumed.data?.verifier!=='string')return failure('GitHub sign-in state is incomplete. Start the connection again.');
  const response=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:AUTH_ORIGIN+'/callback',code_verifier:resumed.data.verifier}),redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return failure('GitHub sign-in could not be completed.',502);
  const data=JSON.parse(await boundedText(response,32768));if(data.error||typeof data.access_token!=='string')return failure('GitHub sign-in could not be completed.',502);
  // The same fixed-repository access check is used by every subsequent tool.
  await createMuseumClient(data.access_token,fetcher).guide();
  const identity=await fetcher('https://api.github.com/user',{headers:{Authorization:`Bearer ${data.access_token}`,Accept:'application/vnd.github+json','User-Agent':'Albion museum MCP'},redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(!identity.ok)return failure('GitHub identity could not be checked.',403);const user=JSON.parse(await boundedText(identity,32768));
  if(!Number.isSafeInteger(user.id)||user.id<=0||typeof user.login!=='string')return failure('GitHub identity could not be checked.',403);
  const complete=await oauth.completeAuthorization({request:resumed.request,userId:String(user.id),metadata:{repository:REPOSITORY},scope:[MCP_SCOPE],props:{githubToken:data.access_token}});
  resumed.headers.set('Location',complete.redirectTo);resumed.headers.set('Referrer-Policy','no-referrer');return new Response(null,{status:302,headers:resumed.headers});
 }catch(error){
  if(error instanceof AuthorizationError&&error.redirectTo)return Response.redirect(error.redirectTo,302);
  if(error instanceof AuthorizationError||error instanceof CimdFetchError)return failure('The connection expired or could not be verified. Start again from Claude.');
  return failure('Museum sign-in could not be completed. Check GitHub editor access and try again.',503);
 }
}
