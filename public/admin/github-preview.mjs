// Use Decap's registered GitHub backend contract. Keep the authenticated
// instance in this module, never read auth storage or copy tokens into previews.
export function registerGitHubPreviewBackend(){
 let backend;
 const Native=window.CMS.getBackend('github').BackendClass;
 window.CMS.registerBackend('albion-github',class extends Native{
  constructor(...args){super(...args);backend=this;}
 });
 return async()=>{const token=await backend?.getToken();if(typeof token!=='string'||!token)throw Error('Sign in with GitHub to preview Astro components.');return token;};
}
