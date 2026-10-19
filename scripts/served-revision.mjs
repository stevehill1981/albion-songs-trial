import { setTimeout } from 'node:timers/promises';

export async function waitForRevision(origin,revision,{fetcher=fetch,sleep=setTimeout,attempts=12}={}) {
  for(let attempt=0;attempt<attempts;attempt++) {
    try {
      const [metadata,page]=await Promise.all([fetcher(`${origin}/version.json`,{cache:'no-store'}),fetcher(`${origin}/songs`,{cache:'no-store'})]);
      if(metadata.ok && page.ok && (await metadata.json()).revision===revision && (await page.text()).includes(`<meta name="trial-revision" content="${revision}">`)) return;
    } catch { /* A transient request failure is retried within the same bound. */ }
    if(attempt+1<attempts) await sleep(2000);
  }
  throw Error('Served revision does not match the revision built by this workflow.');
}
