import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderFact } from '../src/lib/fact.mjs';
const template = await readFile('legacy/songs.html','utf8');
assert.equal(template.split('<!-- EDITABLE_FACT -->').length,2);
const fact = JSON.parse(await readFile('content/fact.json','utf8'));
const version=JSON.parse(await readFile('public/version.json','utf8'));
const expected = template.replace('<!-- EDITABLE_FACT -->',renderFact(fact)).replace('</head>',`<meta name="trial-revision" content="${version.revision}"></head>`);
for (const page of ['build/index.html','build/songs.html']) {
  const html = await readFile(page,'utf8');
  const text = value => value.replace(/\s+/g,' ').trim();
  assert.equal(text(html),text(expected),`Rendered page diverged from retained Songs markup: ${page}`);
}
const preview=JSON.parse(await readFile('build/admin/preview-template.json','utf8')).html;
assert.equal(preview.split('<!-- EDITABLE_FACT -->').length,2);
assert(preview.includes('src="/assets/baggie-bird.webp"'));
assert(!preview.includes('fact-controls'));
assert(!preview.includes('<article'), 'Only the editable fact is included in the focused preview.');
const previewWithFact=preview.replace('<!-- EDITABLE_FACT -->',renderFact(fact));
assert(previewWithFact.includes(renderFact(fact)) && expected.includes(renderFact(fact)));
assert.equal(await readFile('build/admin/fact.mjs','utf8'),await readFile('src/lib/fact.mjs','utf8'));
console.log('PASS: both built routes preserve the retained Songs page and render the validated editorial fact.');
console.log('PASS: the styled editor preview uses the public page’s exact fact renderer, template and image.');
