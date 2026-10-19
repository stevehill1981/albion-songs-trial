import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderFact, validateFact } from '../src/lib/fact.mjs';
const fact = JSON.parse(readFileSync(new URL('../content/fact.json',import.meta.url),'utf8'));
test('the preserved baseline fixture reproduces the source museum entry', () => {
  const origins = JSON.parse(readFileSync(new URL('../plans/origins.json',import.meta.url),'utf8'));
  assert.equal(renderFact(origins.initialFact),origins.firstFactOriginal);
});
test('a legitimate edit changes the rendered fact without being pinned to the baseline',()=>{
  const edited={...fact,title:'A heading edited during the trial'};
  assert.notEqual(renderFact(fact),renderFact(edited));
  assert.match(renderFact(edited),/A heading edited during the trial/);
});
test('editable text is escaped and unsafe source protocols fail', () => {
  assert.match(renderFact({...fact,title:'<script>alert(1)</script>'}),/&lt;script&gt;/);
  for (const sourceURL of ['javascript:alert(1)','http://example.com','https://user:password@example.com']) assert.throws(()=>validateFact({...fact,sourceURL}));
  assert.throws(()=>validateFact({...fact,unknown:'extra'}));
  assert.throws(()=>validateFact({...fact,text:''}));
});
