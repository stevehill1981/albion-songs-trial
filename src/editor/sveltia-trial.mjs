window.CMS_MANUAL_INIT=true;
const {default:CMS,React}=await import('@sveltia/cms');
import {renderPageContent} from '../lib/blocks.mjs';
const response=await fetch('/admin/sveltia/context.json');if(!response.ok)throw Error('Trial preview context unavailable.');const context=await response.json();
const h=React.createElement;
for(const path of ['/styles.css','/museum.css','/albion.css','/songs.css','/layout.css'])CMS.registerPreviewStyle(path);
CMS.registerPreviewTemplate('trial-pages',({entry})=>{
 try{
  const raw=entry.get('data').toJS();
  const page=Object.fromEntries(['slug','title','description','blocks'].map(key=>[key,raw[key]]));page.collections=raw.collections||[];
  return h('div',{},h('p',{style:{padding:'12px 20px',background:'#edf1f8',color:'#111d49'}},'Browser-only trial · immediate styled block preview. Full trial pages use Astro; authenticated live Astro preview is still an integration gate.'),h('div',{dangerouslySetInnerHTML:{__html:renderPageContent(page,context)}}));
 }catch(error){return h('p',{role:'status',style:{padding:'20px'}},'Complete the required fields to preview this page. '+error.message);}
});
const configResponse=await fetch('/admin/sveltia/config.json');if(!configResponse.ok)throw Error('Trial configuration unavailable.');
const config=await configResponse.json();config.site_url=location.origin;config.display_url=location.origin+'/sveltia-trial/managers';config.load_config_file=false;
CMS.init({config});
