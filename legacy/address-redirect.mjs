// Bookmark handoff only. Never forward credentials or request bodies.
import site from '../site.json' with {type:'json'};
export default {
 fetch(request){
  if(!['GET','HEAD'].includes(request.method))return new Response('The museum has moved. Open the editor at '+site.origin+'/admin/ and sign in again.',{status:410,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  const incoming=new URL(request.url),destination=new URL(site.origin);
  destination.pathname=incoming.pathname;
  destination.search=incoming.search;
  return new Response(null,{status:308,headers:{Location:destination.href,'Cache-Control':'public, max-age=3600'}});
 }
};
