const COOKIE = '__Host-albion-oauth';
const TTL = 600;
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2,'0')).join('');
const encode = value => btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode = value => JSON.parse(atob(value.replace(/-/g,'+').replace(/_/g,'/')));
const cookie = value => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${value ? TTL : 0}`;
const response = (text,status=400,headers={}) => new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...headers}});

export async function handle(request,env,fetcher=fetch,now=Date.now) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return response('Method not allowed.',405,{'Allow':'GET'});
  if (url.pathname === '/health') return response(JSON.stringify({configured:!!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.EDITOR_ORIGIN)}),200);
  if (!['/auth','/callback'].includes(url.pathname)) return response('Not found.',404);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.EDITOR_ORIGIN) return response('GitHub sign-in has not been configured yet.',503);
  let origin;
  try { origin = new URL(env.EDITOR_ORIGIN).origin; } catch { return response('Editor configuration is invalid.',503); }
  if (origin !== env.EDITOR_ORIGIN || !origin.startsWith('https://')) return response('Editor configuration is invalid.',503);
  const suppliedOrigin = request.headers.get('Origin');
  if (suppliedOrigin && suppliedOrigin !== origin && suppliedOrigin !== url.origin) return response('Unrecognised editor origin.',403);
  if (url.pathname === '/auth') {
    if (url.searchParams.has('provider') && url.searchParams.get('provider') !== 'github') return response('Unsupported provider.');
    const state = random();
    const verifier = random();
    const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const github = new URL('https://github.com/login/oauth/authorize');
    for (const [key,value] of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:`${url.origin}/callback`,scope:'public_repo',state,code_challenge:challenge,code_challenge_method:'S256'})) github.searchParams.set(key,value);
    return response('',302,{'Location':github.href,'Set-Cookie':cookie(encode({state,verifier,issued:now(),origin}))});
  }
  const clear = {'Set-Cookie':cookie('')};
  let saved;
  try {
    const raw = request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
    if (!raw || raw.length>2000) throw Error();
    saved = decode(raw);
    if (!/^[a-f0-9]{64}$/.test(saved.state) || !/^[a-f0-9]{64}$/.test(saved.verifier) || saved.origin!==origin || !Number.isFinite(saved.issued) || saved.issued>now() || now()-saved.issued>TTL*1000 || saved.state!==url.searchParams.get('state') || !url.searchParams.get('code') || url.searchParams.has('error')) throw Error();
  } catch { return response('Sign-in expired or could not be verified. Close this window and try again.',400,clear); }
  let token;
  try {
    const exchanged = await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:`${url.origin}/callback`,code_verifier:saved.verifier})});
    if (!exchanged.ok) throw Error();
    const data = await exchanged.json();
    if (typeof data.access_token!=='string' || data.error) throw Error();
    token = data.access_token;
    const headers = {'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','User-Agent':'Throstle and Stripes'};
    const identity = await fetcher('https://api.github.com/user',{headers});
    if (!identity.ok || !(await identity.json()).login) throw Error();
    const access = await fetcher('https://api.github.com/repos/stevehill1981/albion-songs-trial',{headers});
    if (!access.ok || (await access.json()).permissions?.push !== true) return response('This GitHub login does not have editor access to the museum repository.',403,clear);
  } catch { return response('GitHub sign-in could not be completed. Close this window and try again.',502,clear); }
  const nonce = random();
  const payload = JSON.stringify(`authorization:github:success:${JSON.stringify({token,provider:'github'})}`).replace(/</g,'\\u003c');
  const html = `<!doctype html><html lang="en-GB"><meta charset="utf-8"><title>GitHub sign-in</title><p>Sign-in complete. Returning to the editor…</p><script nonce="${nonce}">const target=${JSON.stringify(origin)};const opener=window.opener;if(opener){const receive=event=>{if(event.source!==opener||event.origin!==target||event.data!=='authorizing:github')return;window.removeEventListener('message',receive);opener.postMessage(${payload},target);window.close();};window.addEventListener('message',receive);opener.postMessage('authorizing:github',target);}</script></html>`;
  return new Response(html,{headers:{...clear,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`}});
}

export default {fetch(request,env) { return handle(request,env); }};
