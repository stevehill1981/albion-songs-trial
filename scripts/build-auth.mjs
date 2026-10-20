import {build} from 'vite';
import {execFileSync} from 'node:child_process';
const revision=process.env.GITHUB_SHA||execFileSync('git',['-c','core.fsmonitor=false','rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(revision))throw Error('The auth build needs an exact Git revision.');
await build({configFile:false,define:{__ALBION_MCP_REVISION__:JSON.stringify(revision)},logLevel:'warn',resolve:{conditions:['workerd','worker','browser']},ssr:{target:'webworker',noExternal:true,resolve:{conditions:['workerd','worker','browser']}},build:{ssr:'auth/entry.mjs',outDir:'auth/build',emptyOutDir:true,minify:process.env.ALBION_CPU_SYMBOLS!=='1',rollupOptions:{external:['cloudflare:workers','node:async_hooks'],output:{entryFileNames:'index.mjs'}}}});
console.log('PASS: bundled the existing auth Worker with the museum MCP endpoint.');
