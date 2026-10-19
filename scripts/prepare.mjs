import { copyFile, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { validateFact } from '../src/lib/fact.mjs';

validateFact(JSON.parse(await readFile('content/fact.json', 'utf8')));
await copyFile('node_modules/decap-cms/dist/decap-cms.js', 'public/admin/decap-cms.js');
await copyFile('src/lib/fact.mjs', 'public/admin/fact.mjs');
const pageTemplate=await readFile('legacy/songs.html','utf8');
const marker=pageTemplate.indexOf('<!-- EDITABLE_FACT -->');
if(marker<0)throw Error('The editable fact marker is missing.');
const start=pageTemplate.lastIndexOf('<aside ',marker);
const end=pageTemplate.indexOf('</aside>',marker);
if(start<0 || end<0)throw Error('The fact section is missing.');
const previewTemplate=pageTemplate.slice(start,end+8)
  .replace(/<article class="fact-panel" data-fact>[\s\S]*?<\/article>/g,'')
  .replace(/<div class="fact-controls" hidden>[\s\S]*?<\/div>/,'')
  .replaceAll('src="assets/','src="/assets/');
await writeFile('public/admin/preview-template.json',JSON.stringify({html:previewTemplate})+'\n');
let revision = process.env.GITHUB_SHA;
if (!revision) {
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
  catch { revision = 'local-build'; }
}
await writeFile('public/version.json', JSON.stringify({revision}) + '\n');
const site = JSON.parse(await readFile('site.json', 'utf8'));
const config = `backend:
  name: github
  repo: stevehill1981/albion-songs-trial
  branch: main
  auth_scope: public_repo
  base_url: ${site.authOrigin || 'https://authentication-not-configured.invalid'}
  auth_endpoint: auth
  preview_context: albion/deploy-preview
publish_mode: editorial_workflow
site_url: ${site.origin || 'http://localhost:4321'}
display_url: ${site.origin || 'http://localhost:4321'}
media_folder: public/uploads
public_folder: /uploads
collections:
  - name: songs
    label: Songs & terrace culture
    delete: false
    files:
      - name: blue-vinyl
        label: Baggie Bird — Albion on blue vinyl
        file: content/fact.json
        preview_path: songs
        fields:
          - {label: Heading, name: title, widget: string}
          - {label: Fact, name: text, widget: text}
          - {label: Source link, name: sourceURL, widget: string, pattern: ['^https://', 'Use an HTTPS source link.']}
          - {label: Source label, name: sourceLabel, widget: string}
`;
await writeFile('public/admin/config.yml', config);
const origin = site.origin || '';
await writeFile('public/publication.html', `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Publishing the Songs trial</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/albion.css"><main class="wrap section"><h1>Publishing the Songs trial</h1><p><a href="/admin/">Open the editor</a> · <a href="/songs#terrace-facts">Read Baggie Bird’s fact</a></p><ol><li>Sign in with your own GitHub login.</li><li>Open Songs &amp; terrace culture, change the blue-vinyl fact and save a draft.</li><li>Wait for View preview. Open it and check the fact in the full Songs page.</li><li>Use the editor’s workflow to mark it ready and publish. Required checks must pass first.</li><li>Wait for publication below, then open the public page. If a check fails, the previous published page stays live.</li></ol><p>To undo a change, edit the previous wording back in the editor, preview and publish again. GitHub retains previous versions if you need to recover the text.</p><p id="publication-status" role="status">Checking publication status…</p><p><a href="https://github.com/stevehill1981/albion-songs-trial/actions">View build details on GitHub</a></p><p>This is an editing trial. <a href="https://maries-albion-scrapbook.stevehill1981.chatgpt.site/songs">Visit the existing museum.</a></p></main><script type="module">const status=document.querySelector('#publication-status');try{const [live,branch]=await Promise.all([fetch('${origin}/version.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('https://api.github.com/repos/stevehill1981/albion-songs-trial/commits/main',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()})]);status.textContent=live.revision===branch.sha?'The latest published revision is live.':'A newer revision is waiting to publish or needs attention. Check the build details below.';}catch{status.textContent='Publication status is unavailable. Check the public fact and build details before assuming a change is live.'}</script></html>`);
