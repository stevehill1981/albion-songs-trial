export function readAuthMessage(event,{popup,origin}){
 if(!popup||event.source!==popup||event.origin!==origin||typeof event.data!=='string')return null;
 if(event.data==='authorizing:github')return{handshake:true};
 const prefix='authorization:github:success:';
 if(!event.data.startsWith(prefix))return null;
 try{const result=JSON.parse(event.data.slice(prefix.length));if(result.provider==='github'&&/^[a-zA-Z0-9_]{20,256}$/.test(result.token))return{token:result.token};}catch{}
 return null;
}
