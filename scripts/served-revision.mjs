import { setTimeout } from 'node:timers/promises';
export async function waitForRevision(origin,revision,{fetcher=fetch,sleep=setTimeout,attempts=12,routes=['/songs']}={}) {
 if(!routes.length)throw Error('At least one public page must be checked.');
 for(let attempt=0;attempt<attempts;attempt++) {
  try {
   const options={cache:'no-store',signal:AbortSignal.timeout(15000)};
   const [metadata,...pages]=await Promise.all([fetcher(`${origin}/version.json`,options),...routes.map(route=>fetcher(`${origin}${route}`,options))]);
   if(metadata.ok&&pages.every(p=>p.ok)&&(await metadata.json()).revision===revision){
    const html=await Promise.all(pages.map(p=>p.text()));
    if(html.every(h=>h.includes(`<meta name="trial-revision" content="${revision}">`)))return;
   }
  }catch{/* Retry transient fetch failures within the same bound. */}
  if(attempt+1<attempts)await sleep(2000);
 }
 throw Error('Served revision does not match the revision built by this workflow.');
}
