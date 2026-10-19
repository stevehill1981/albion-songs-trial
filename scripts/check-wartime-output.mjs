import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{summarize}from'../public/results-core.mjs';
const w=JSON.parse(await readFile('public/data/wartime-results.json','utf8'));
const competitive=JSON.parse(await readFile('public/data/results.json','utf8'));
assert(w.matches.length>=266,'Do not shrink the included wartime archive.');
assert.equal(new Set(w.matches.map(m=>m.id)).size,w.matches.length);
const official=new Set(competitive.matches.map(m=>m.id));
for(const m of w.matches){assert(!official.has(m.id),'Wartime games must stay outside the competitive totals.');assert(['crosschecked','single-source'].includes(m.evidenceStatus));assert(m.source.startsWith('https://'));if(m.evidenceStatus==='crosschecked')assert(m.corroboration||m.additionalSources?.length);}
const html=await readFile('build/wartime.html','utf8');
const rows=[...html.matchAll(/<tr[^>]*data-match-id="([^"]+)"[^>]*data-evidence-status="([^"]+)"/g)];
assert.equal(rows.length,w.matches.length,'Every saved wartime match needs a readable HTML row.');
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const byId=new Map(rows.map(r=>[decode(r[1]),r[2]]));
for(const m of w.matches)assert.equal(byId.get(m.id),m.evidenceStatus,'The visible evidence label must agree with the data.');
const totals=summarize(w.matches);assert.equal(totals.W+totals.D+totals.L,w.matches.length);
const csv=await readFile('public/data/wartime-results.csv','utf8');assert.equal(csv.trim().split('\n').length,w.matches.length+1);
console.log(`PASS: ${w.matches.length} wartime records, HTML evidence labels and CSV agree; official totals remain separate.`);
