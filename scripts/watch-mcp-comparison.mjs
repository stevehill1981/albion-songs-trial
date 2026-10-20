// A bounded, owner-approved administrative watchdog, never part of the Worker.
// Restores only the recorded existing version; it cannot provision or upgrade.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,access} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
const args=Object.fromEntries(process.argv.slice(2).map((value,index,all)=>index%2===0?[value,all[index+1]]:null).filter(Boolean));
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
assert(uuid.test(args['--baseline'])&&uuid.test(args['--fallback']),'Supply recorded baseline and fallback version UUIDs.');
assert(/^[a-f0-9]{40}$/.test(args['--revision']),'Supply the expected baseline source revision.');
assert(args['--stop-file']?.startsWith('/tmp/')&&args['--receipt']?.startsWith('/tmp/'),'Use task-owned temporary signal and receipt paths.');
const windowMs=Number(args['--window-ms']||900000);assert(Number.isInteger(windowMs)&&windowMs>=1000&&windowMs<=900000);
const config=JSON.parse(await readFile(new URL('../auth/mcp-config.json',import.meta.url)));assert(/^[a-f0-9]{32}$/.test(config.accountId));
const cf=values=>{
 const result=spawnSync('mise',['exec','node@24.9.0','--','cf',...values],{env:{...process.env,CLOUDFLARE_ACCOUNT_ID:config.accountId},encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.status,0,'The bounded Cloudflare operation failed.');return JSON.parse(result.stdout);
};
const active=()=>{
 const data=cf(['workers','deployments','list','--script-name','albion-songs-auth']);
 assert(Array.isArray(data.deployments)&&data.deployments.length,'A positive deployment record is required.');
 const latest=[...data.deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];
 assert(latest.versions?.length===1&&latest.versions[0].percentage===100,'Expected one explicit 100% deployment.');return latest.versions[0].version_id;
};
assert.equal(active(),args['--baseline'],'Arm only while the checked baseline is active.');
let interrupted=false;for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{interrupted=true;});
const startedAt=new Date().toISOString(),deadline=Date.now()+windowMs;
console.log(JSON.stringify({armed:true,startedAt,baseline:args['--baseline'],deadline:new Date(deadline).toISOString()}));
while(!interrupted&&Date.now()<deadline){if(await access(args['--stop-file']).then(()=>true,()=>false))break;await sleep(Math.min(1000,deadline-Date.now()));}
const failures=[];let restored;
for(const version of [...new Set([args['--baseline'],args['--fallback']])]){
 try{
  cf(['workers','deployments','create','--script-name','albion-songs-auth','--strategy','percentage','--versions',JSON.stringify([{version_id:version,percentage:100}])]);
  assert.equal(active(),version,'Rollback must be confirmed by the active deployment.');
  const health=await fetch('https://albion-songs-auth.steve-e85.workers.dev/mcp-health',{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(response=>{assert(response.ok);return response.json();});
  assert(health.configured);if(version===args['--baseline'])assert.equal(health.revision,args['--revision']);
  restored={version,revision:health.revision};break;
 }catch{failures.push({version,failed:true});}
}
const receipt={startedAt,finishedAt:new Date().toISOString(),restored:restored||null,failures};
await writeFile(args['--receipt'],JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));assert(restored,'Automatic rollback could not be verified; restore the recorded version manually.');
