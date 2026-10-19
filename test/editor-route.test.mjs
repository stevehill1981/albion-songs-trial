import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('the editor configuration resolves inside admin after trailing-slash redirects',()=>{
  const html=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
  const config=html.match(/<link href="([^"]+)" type="text\/yaml"/)[1];
  for(const path of ['/admin#/','/admin/']) assert.equal(new URL(config,`https://example.com${path}`).pathname,'/admin/config.yml');
});
