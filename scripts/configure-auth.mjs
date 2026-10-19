import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

if(!process.stdin.isTTY) throw Error('Run this in your own terminal so credentials can be entered without echo.');
async function hidden(label) {
  process.stdout.write(label);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve,reject)=>{
    let input='';
    function receive(chunk) {
      for(const char of chunk.toString()) {
        if(char==='\u0003'){cleanup();reject(Error('Cancelled.'));return;}
        if(char==='\r'||char==='\n'){cleanup();resolve(input.trim());return;}
        if(char==='\u007f')input=input.slice(0,-1);else input+=char;
      }
    }
    function cleanup(){process.stdin.off('data',receive);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}
    process.stdin.on('data',receive);
  });
}
const site=JSON.parse(readFileSync('site.json','utf8'));
console.log('Create a GitHub OAuth app at https://github.com/settings/applications/new');
console.log(`Homepage: ${site.origin}/admin/`);
console.log(`Callback: ${site.authOrigin}/callback`);
console.log('Enter its credentials here. They are sent to Cloudflare through stdin, never written to this repository.');
const id=await hidden('Client ID: ');
const secret=await hidden('Client secret: ');
if(!id || !secret)throw Error('Both app credentials are required.');
execFileSync(process.execPath,['scripts/cloudflare-output.mjs','--auth'],{stdio:'inherit'});
const result=spawnSync('npx',['--yes','--package=cf@1.0.0-beta.14','cf','deploy','--prebuilt','--secrets-file','/dev/stdin'],{cwd:'auth',input:JSON.stringify({GITHUB_CLIENT_ID:id,GITHUB_CLIENT_SECRET:secret,EDITOR_ORIGIN:site.origin}),encoding:'utf8',maxBuffer:4*1024*1024});
if(result.status!==0) throw Error(`Cloudflare auth configuration failed: ${result.stderr || result.stdout}`);
console.log(result.stdout);
const response=await fetch(`${site.authOrigin}/health`);
if(!response.ok || !(await response.json()).configured)throw Error('The auth service did not report configured.');
console.log(`Sign-in is configured. Open ${site.origin}/admin/ and test your GitHub login.`);
