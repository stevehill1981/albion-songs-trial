import {build} from 'vite';
import {execFileSync} from 'node:child_process';
const revision=process.env.GITHUB_SHA||execFileSync('git',['-c','core.fsmonitor=false','rev-parse','HEAD'],{encoding:'utf8'}).trim();
const handler=process.env.ALBION_MCP_HANDLER||'lean';
if(!['baseline','lean'].includes(handler))throw Error('Choose baseline or lean for the local MCP build.');
if(!/^[a-f0-9]{40}$/.test(revision))throw Error('The auth build needs an exact Git revision.');
await build({configFile:false,define:{__ALBION_MCP_REVISION__:JSON.stringify(revision),__ALBION_MCP_LEAN__:JSON.stringify(handler==='lean')},logLevel:'warn',resolve:{conditions:['workerd','worker','browser']},ssr:{target:'webworker',noExternal:true,resolve:{conditions:['workerd','worker','browser']}},build:{ssr:'auth/entry.mjs',outDir:'auth/build',emptyOutDir:true,minify:process.env.ALBION_CPU_SYMBOLS!=='1',rollupOptions:{external:['cloudflare:workers','node:async_hooks'],output:{entryFileNames:'index.mjs'}}}});
console.log(`PASS: bundled the ${handler} auth Worker in auth/build.`);
