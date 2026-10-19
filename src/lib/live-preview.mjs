export function createLivePreview({request,onState,delay=400,schedule=setTimeout,cancel=clearTimeout}){
 let generation=0,timer,controller,disposed=false;
 return{
  update(page){
   if(disposed)return;
   const current=++generation;cancel(timer);controller?.abort();
   onState({status:'updating',message:'Updating Astro component preview…'});
   timer=schedule(async()=>{
    const pending=new AbortController();controller=pending;
    try{const html=await request(page,pending.signal);if(!disposed&&generation===current)onState({status:'ready',message:'Live Astro components · changes appear before saving.',html});}
    catch(error){if(!disposed&&generation===current&&error.name!=='AbortError')onState({status:'error',message:error.message||'Preview unavailable. The last successful preview is still shown.'});}
   },delay);
  },
  dispose(){disposed=true;++generation;cancel(timer);controller?.abort();}
 };
}
