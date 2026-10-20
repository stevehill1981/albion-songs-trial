import { execFileSync } from 'node:child_process';
import { writeFile,readFile } from 'node:fs/promises';
import { waitForRevision,waitForPreviewRuntime } from './served-revision.mjs';
import { loadContent } from '../src/lib/content.mjs';
const site=JSON.parse(await readFile('site.json','utf8'));
const sha=process.env.GITHUB_SHA;
const repo=process.env.GITHUB_REPOSITORY;
const branch=process.env.GITHUB_REF_NAME;
if(!sha || !repo || !branch || !process.env.GITHUB_TOKEN) throw Error('Run publishing from the configured GitHub workflow.');
const draft=branch!=='main';
const context=draft?'albion/deploy-preview':'albion/production';
async function status(state,url,description) {
  const res=await fetch(`https://api.github.com/repos/${repo}/statuses/${sha}`,{method:'POST',headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({state,context,target_url:url,description})});
  if(!res.ok) throw Error(`Could not record ${context} status: ${res.status}`);
}
await status('pending',undefined,draft?'Building this draft’s preview.':'Publishing Throstle & Stripes.');
try {
  const args=draft?['workers','versions','create','--prebuilt','--tag',sha.slice(0,8),'--message',sha]:['deploy','--prebuilt','--tag',sha.slice(0,8),'--message',sha];
  const output=execFileSync('npx',['--yes','--package=cf@1.0.0-beta.14','cf',...args],{encoding:'utf8',maxBuffer:4*1024*1024});
  console.log(output);
  const candidates=[...output.matchAll(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev/g)].map(x=>x[0]);
  const url=draft?candidates.find(x=>x!==site.origin):site.origin;
  if(!url) throw Error('Cloudflare did not return a draft version URL.');
  const content=await loadContent();
  await waitForRevision(url,sha,{routes:['/pages','/images',...content.photoEntries.map(p=>`/images/${p.id}`),...content.pages.map(p=>`/${p.slug}`),...content.collections.map(c=>`/collections/${c.slug}`),...content.templates.map(p=>`/templates/${p.slug}`)]});
  await waitForPreviewRuntime(url,sha);
  await status('success',url,draft?'This exact draft is ready to preview.':'This revision is live.');
  await writeFile(process.env.GITHUB_STEP_SUMMARY||'/dev/null',`[${draft?'Preview this draft':'View Throstle & Stripes'}](${url}/)\n\nVerified served revision: ${sha}\n`);
} catch(error) {
  await status('failure',undefined,'Build or publication failed; see the workflow log.');
  throw error;
}
