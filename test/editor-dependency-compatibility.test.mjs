import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import * as esm from 'uuid';
const require=createRequire(import.meta.url);
const cjs=require('uuid');
const namespace='6ba7b810-9dad-11d1-80b4-00c04fd430c8';
function expectedNameUUID(algorithm,version,name){
 const bytes=createHash(algorithm).update(Buffer.from(namespace.replaceAll('-',''),'hex')).update(name).digest().subarray(0,16);
 bytes[6]=(bytes[6]&15)|(version<<4);bytes[8]=(bytes[8]&63)|128;
 const hex=bytes.toString('hex');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
test('UUID namespace output agrees with independent standard hashes in ESM and CommonJS',()=>{
 for(const api of [esm,cjs])for(const [fn,algorithm,version] of [['v3','md5',3],['v5','sha1',5]]){
  const expected=expectedNameUUID(algorithm,version,'Throstle & Stripes');
  assert.equal(api[fn]('Throstle & Stripes',namespace),expected);
  assert.equal(api.stringify(api.parse(expected)),expected);
  const buffer=new Uint8Array(24).fill(170);
  assert.equal(api[fn]('Throstle & Stripes',namespace,buffer,4),buffer);
  assert.equal(api.stringify(buffer,4),expected);assert.deepEqual([...buffer.slice(0,4)],[170,170,170,170]);assert.deepEqual([...buffer.slice(20)],[170,170,170,170]);
 }
});
test('UUID rejects invalid output bounds instead of silently returning a partial identifier',()=>{
 for(const api of [esm,cjs])for(const fn of ['v3','v5'])for(const [length,offset] of [[8,4],[16,1],[16,-1]]){
  const buffer=new Uint8Array(length).fill(170);
  assert.throws(()=>api[fn]('museum-boundary-check',namespace,buffer,offset),RangeError);
  assert(buffer.every(n=>n===170),'A rejected call must not partially modify its output.');
 }
});
test('all declared Decap UUID consumers resolve the checked package and preserve random IDs',()=>{
 for(const name of ['core','lib-auth','widget-file','widget-list','widget-relation']){
  const consumer=createRequire(require.resolve('decap-cms-'+name+'/package.json'));
  assert.equal(consumer.resolve('uuid'),require.resolve('uuid'));
  const api=consumer('uuid');const ids=new Set(Array.from({length:100},()=>api.v4()));
  assert.equal(ids.size,100);for(const id of ids){assert(api.validate(id));assert.equal(api.version(id),4);}
 }
});
