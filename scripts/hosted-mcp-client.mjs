// Interactive, owner-consented test client. Credentials live only in memory.
// No browser session, GitHub token or Cloudflare credential is read by this client.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
assert(process.argv.includes('--interactive'),'Run this owner-consented diagnostic with --interactive.');
const origin='https://albion-songs-auth.steve-e85.workers.dev';
const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url');
let acceptCode,rejectCode,client,terminal,accessToken;
const callback=new Promise((resolve,reject)=>{acceptCode=resolve;rejectCode=reject;});
// Keep an unattended run bounded, including when browser consent is abandoned.
const timeout=setTimeout(()=>{rejectCode(Error('Browser consent timed out.'));terminal?.close();void finish();},15*60*1000);
const listener=createServer((request,response)=>{
 const url=new URL(request.url,'http://127.0.0.1');
 if(request.method!=='GET'||url.pathname!=='/callback'||url.searchParams.get('state')!==state){response.writeHead(400).end('Invalid test callback.');return;}
 const code=url.searchParams.get('code');
 if(!code){response.writeHead(400).end('Connection was not approved.');rejectCode(Error('Connection was not approved.'));return;}
 response.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end('Albion connector test is connected. You can close this tab.');acceptCode(code);
});
async function finish(){clearTimeout(timeout);accessToken=undefined;await client?.close();listener.close();}
try{
 await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
 const redirect=`http://127.0.0.1:${listener.address().port}/callback`;
 const registration=await fetch(origin+'/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'Albion direct diagnostic client',redirect_uris:[redirect],grant_types:['authorization_code'],response_types:['code'],token_endpoint_auth_method:'none'}),signal:AbortSignal.timeout(15000)});
 assert(registration.ok,'Diagnostic client registration failed.');const {client_id}=await registration.json();assert(client_id);
 const query=new URLSearchParams({client_id,redirect_uri:redirect,response_type:'code',scope:'museum:manage',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',resource:origin+'/mcp'});
 console.log('Owner consent URL: '+origin+'/authorize?'+query);
 const code=await callback;
 const exchanged=await fetch(origin+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id,code,code_verifier:verifier,redirect_uri:redirect,resource:origin+'/mcp'}),signal:AbortSignal.timeout(15000)});
 assert(exchanged.ok,'Diagnostic token exchange failed.');accessToken=(await exchanged.json()).access_token;assert(accessToken);
 client=new Client({name:'Albion direct diagnostic client',version:'1'});
 await client.connect(new StreamableHTTPClientTransport(new URL(origin+'/mcp'),{authProvider:{token:async()=>accessToken}}));
 const tools=await client.listTools();console.log(JSON.stringify({connected:true,tools:tools.tools.map(t=>t.name)}));
 terminal=createInterface({input:process.stdin,output:process.stdout,terminal:false});
 console.log('Send JSON {"tool":"museum_guide","arguments":{}}; {"repeat":10,"tool":"museum_guide","arguments":{}}; or {"quit":true}.');
 for await(const line of terminal){
  try{
   const input=JSON.parse(line);if(input.quit)break;
   assert(tools.tools.some(t=>t.name===input.tool),'Choose a discovered tool.');
   const repeat=input.repeat??1;assert(Number.isInteger(repeat)&&repeat>=1&&repeat<=100);
   assert(repeat===1||tools.tools.find(t=>t.name===input.tool).annotations?.readOnlyHint===true,'Only read operations can repeat.');
   for(let index=0;index<repeat;index++){
    const result=await client.callTool({name:input.tool,arguments:input.arguments??{}});
    console.log(JSON.stringify({at:new Date().toISOString(),tool:input.tool,index,result}));
   }
  }catch(error){console.log(JSON.stringify({failed:true,message:error.message}));}
 }
}finally{terminal?.close();await finish();}
