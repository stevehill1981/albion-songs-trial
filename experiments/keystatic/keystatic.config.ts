import {config,fields,collection} from '@keystatic/core';
import {block} from '@keystatic/core/content-components';
export default config({
 storage:import.meta.env.PUBLIC_KEYSTATIC_TRIAL_GITHUB==='1'?{kind:'github',repo:'stevehill1981/albion-songs-trial',branchPrefix:'keystatic-trial/'}:{kind:'local'},
 ui:{brand:{name:'Throstle & Stripes · local trial'},navigation:{'Your website':['pages','collections']}},
 collections:{
  pages:collection({label:'Pages',slugField:'title',path:'content/pages/**',previewUrl:'/{slug}',entryLayout:'content',format:{contentField:'body'},
   schema:{
    title:fields.slug({name:{label:'Page title'},slug:{label:'Page address',description:'Nested addresses use a slash, for example managers/darren-moore.'}}),
    description:fields.text({label:'Short description',description:'A sentence to help visitors understand this page.',multiline:true}),
    collection:fields.relationship({label:'Museum collection',collection:'collections',description:'Group related pages without changing their addresses.'}),
    body:fields.markdoc({label:'Page content',components:{
     story:block({label:'Text and sources',schema:{heading:fields.text({label:'Heading'}),text:fields.text({label:'Text',multiline:true}),sourceLabel:fields.text({label:'Source name'}),sourceURL:fields.url({label:'Source link'})}}),
     photograph:block({label:'Credited photograph',schema:{heading:fields.text({label:'Heading'}),photograph:fields.select({label:'Photograph',options:[{label:'The Hawthorns',value:'hawthorns'},{label:'Albion team, 1888',value:'team-1888'}],defaultValue:'hawthorns'})}})
    }})
   }}),
  collections:collection({label:'Museum collections',slugField:'title',path:'content/collections/*',format:{data:'json'},schema:{title:fields.slug({name:{label:'Collection name'}}),description:fields.text({label:'Description',multiline:true})}})
 }
});
