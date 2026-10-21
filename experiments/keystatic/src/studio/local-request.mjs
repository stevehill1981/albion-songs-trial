export async function localJSON(request,isDev){
 const url=new URL(request.url);
 if(!isDev||!['127.0.0.1','localhost'].includes(url.hostname)||request.method!=='POST'||request.headers.get('Origin')!==url.origin)throw Error('Use the local studio. This proof is disabled when deployed.');
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw Error('Send a supported studio request.');
 const reader=request.body?.getReader();if(!reader)throw Error('Missing request.');let size=0,text='';const decoder=new TextDecoder();
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw Error('Keep the local proof below 64 KB.');}text+=decoder.decode(value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{reader.releaseLock();}
}
