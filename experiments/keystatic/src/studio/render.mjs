import {Markdoc} from '@astrojs/markdoc/config';
const {parse,transform,validate}=Markdoc;
const config={tags:{
 story:{render:'studio-story',attributes:{heading:{type:String,required:true},text:{type:String,required:true},sourceLabel:{type:String},sourceURL:{type:String}}},
 photograph:{render:'studio-photo',attributes:{heading:{type:String},photograph:{type:String,required:true,matches:['hawthorns','team-1888']}}}
}};
export function renderTree(markdown){
 const ast=parse(markdown),errors=validate(ast,config);if(errors.length)throw Error('Complete the supported content blocks before previewing.');
 for(const node of ast.walk()){
  if(node.type==='link'&&!/^(https:\/\/|\/(?!\/)|#)/.test(node.attributes.href||''))throw Error('Use an HTTPS or local source link.');
  if(node.tag==='story'&&node.attributes.sourceURL&&!/^https:\/\//.test(node.attributes.sourceURL))throw Error('Source links must use HTTPS.');
 }
 return transform(ast,config);
}
