import {OAuthProvider} from '@cloudflare/workers-oauth-provider';
import {museumMcp,museumDiagnosticMcp} from './mcp/server.mjs';
import {hostHeaderValidationResponse,originValidationResponse} from '@modelcontextprotocol/server';
import {handleAuthorization,AUTH_ORIGIN,MCP_SCOPE} from './mcp/authorization.mjs';
import {handle as decap} from './worker.mjs';
import {boundedText,createMuseumClient} from './mcp/github.mjs';
async function protectedMuseum(request,env,ctx){
 const path=new URL(request.url).pathname;
 if(path==='/mcp/diagnostic/guide')return museumDiagnosticMcp(request,env,ctx);
 if(path==='/mcp/diagnostic/auth'){
  const rejected=hostHeaderValidationResponse(request,[new URL(AUTH_ORIGIN).host])||originValidationResponse(request,[new URL(AUTH_ORIGIN).host,'claude.ai']);if(rejected)return rejected;
  if(request.method!=='POST')return new Response('Method not allowed.',{status:405});
  try{await createMuseumClient(ctx?.props?.githubToken).guide();return Response.json({editor:true},{headers:{'Cache-Control':'no-store'}});}
  catch{return new Response('Museum editor access is required.',{status:403,headers:{'Cache-Control':'no-store'}});}
 }
 return museumMcp(request,env,ctx);
}
export const museumOAuth=new OAuthProvider({
 apiRoute:'/mcp',apiHandler:{fetch: protectedMuseum},
 authorizeEndpoint:'/authorize',tokenEndpoint:'/token',clientRegistrationEndpoint:'/register',
 defaultHandler:{fetch:handleAuthorization},
 accessTokenTTL:3600,refreshTokenTTL:7*24*3600,clientRegistrationTTL:7*24*3600,
 scopesSupported:[MCP_SCOPE],requiredScopes:[MCP_SCOPE],
 resourceMetadata:{resource:AUTH_ORIGIN+'/mcp',authorization_servers:[AUTH_ORIGIN],bearer_methods_supported:['header'],resource_name:'Marie’s Albion museum'},
});
export default{async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(url.pathname==='/mcp-health')return Response.json({configured:!!(env.OAUTH_KV&&env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET),revision:__ALBION_MCP_REVISION__},{headers:{'Cache-Control':'no-store'}});
 // Existing visual-editor login keeps working before the KV binding is provisioned.
 if(!env.OAUTH_KV)return ['/mcp','/authorize','/token','/register'].includes(url.pathname)||url.pathname.startsWith('/.well-known/')?new Response('Museum MCP setup is pending.',{status:503,headers:{'Cache-Control':'no-store'}}):decap(request,env);
 if(url.origin!==AUTH_ORIGIN)return new Response('Unrecognised museum authentication host.',{status:403});
 try{
  if(!['GET','HEAD'].includes(request.method)){
   const maximum=url.pathname==='/mcp'?512*1024:16*1024;
   const text=await boundedText(request,maximum);request=new Request(request,{body:text});
  }
  return await museumOAuth.fetch(request,env,ctx);
 }catch{return new Response('Museum connection is temporarily unavailable. Try again shortly.',{status:503,headers:{'Cache-Control':'no-store'}});}
}};
