import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderFact } from '../src/lib/fact.mjs';
const template = await readFile('legacy/songs.html','utf8');
assert.equal(template.split('<!-- EDITABLE_FACT -->').length,2);
const fact = JSON.parse(await readFile('content/fact.json','utf8'));
const expected = template.replace('<!-- EDITABLE_FACT -->',renderFact(fact));
for (const page of ['build/index.html','build/songs.html']) {
  const html = await readFile(page,'utf8');
  const text = value => value.replace(/\s+/g,' ').trim();
  assert.equal(text(html),text(expected),`Rendered page diverged from retained Songs markup: ${page}`);
}
console.log('PASS: both built routes preserve the retained Songs page and render the validated editorial fact.');
