import {fields} from '@keystatic/core';
import {block} from '@keystatic/core/content-components';
export const documentField=fields.markdoc({label:'Page content',options:{image:false},components:{
 story:block({label:'Text and sources',schema:{heading:fields.text({label:'Heading'}),text:fields.text({label:'Text',multiline:true}),sourceLabel:fields.text({label:'Source name'}),sourceURL:fields.url({label:'Source link'})}}),
 photograph:block({label:'Credited photograph',schema:{heading:fields.text({label:'Heading'}),photograph:fields.select({label:'Photograph',options:[{label:'The Hawthorns',value:'hawthorns'},{label:'Albion team, 1888',value:'team-1888'}],defaultValue:'hawthorns'})}})
}});
export function parseDocument(page){return documentField.parse(undefined,{content:new TextEncoder().encode(page.markdown),other:new Map(),external:new Map(),slug:page.id});}
export function writeDocument(value,id){const output=documentField.serialize(value,{slug:id});if(output.other.size||output.external.size)throw Error('Choose an existing credited photograph in this proof.');return new TextDecoder().decode(output.content);}
