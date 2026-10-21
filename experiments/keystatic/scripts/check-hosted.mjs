import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
const directory=new URL('../dist/server/chunks/',import.meta.url),files=(await readdir(directory)).filter(name=>/^studio-api_.*\.mjs$/.test(name));
assert.equal(files.length,1,'Build exactly one compiled studio API module.');
const {page}=await import(new URL(files[0],directory));
const result=await page().POST({request:new Request('https://example.invalid/studio-api',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({action:'publish'})})});
assert.equal(result.status,403);assert.equal(await result.text(),'Local proof only');
console.log('PASS compiled hosted studio write endpoint rejects publication with HTTP403.');
