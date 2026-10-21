import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {validateWorkspace,seedWorkspace} from './workspace.mjs';
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const mutationQueues=new Map();
function check(value,message){if(!value)throw Error(message);}
export function createLocalStore({root,renderSnapshot}){
 const directory=join(root,'.studio-state');
 const locked=fn=>{const previous=mutationQueues.get(root)||Promise.resolve(),result=previous.catch(()=>{}).then(fn);mutationQueues.set(root,result);result.finally(()=>{if(mutationQueues.get(root)===result)mutationQueues.delete(root);}).catch(()=>{});return result;};
 const json=async path=>JSON.parse(await readFile(path,'utf8'));
 async function release(){try{return validateWorkspace(await json(join(directory,'release.json')));}catch(error){if(error.code==='ENOENT')return seedWorkspace();throw error;}}
 async function working(){try{return validateWorkspace((await json(join(root,'content/studio-proof.json'))).workspace);}catch(error){if(error.code==='ENOENT')throw Error('Use Keystatic Save above to store the working draft first.');throw error;}}
 async function record(number){check(Number.isSafeInteger(number)&&number>0,'Choose an existing draft.');const row=await json(join(directory,`draft-${number}.json`));validateWorkspace(row.document);check(digest(row.document)===row.commit,'The saved draft no longer matches its revision.');return row;}
 async function rendered(document){const html=await renderSnapshot(document);check(Array.isArray(html)&&html.length===document.pages.length&&html.every(s=>typeof s==='string'&&s.length>0),'Every page must render before publishing.');return html.map(digest);}
 async function status(number){const row=await record(number),current=await release(),fresh=await rendered(row.document),previewVerified=JSON.stringify(fresh)===JSON.stringify(row.previews);const alreadyReleased=digest(current)===row.commit;return{...row,draftNumber:number,pageId:'studio-proof',state:alreadyReleased?'merged':'open',...(alreadyReleased?{publicationRevision:row.commit}:{}),previewVerified,canPublish:!alreadyReleased&&previewVerified&&digest(current)===row.baseRevision,previewUrl:`/studio-saved?draft=${number}`,publicUrl:'/studio-release'};}
 return{
  async capture(document){return locked(async()=>{validateWorkspace(document);check(digest(await working())===digest(document),'There are unsaved changes. Use Keystatic Save above first.');const baseRevision=digest(await release()),previews=await rendered(document);check(digest(await working())===digest(document)&&digest(await release())===baseRevision,'The saved content changed while checking. Check again.');await mkdir(directory,{recursive:true});const existing=(await readdir(directory)).filter(name=>/^draft-\d+\.json$/.test(name));check(existing.length<50,'This local proof keeps up to 50 snapshots.');const draftNumber=Math.max(Date.now(),...existing.map(name=>Number(name.slice(6,-5))+1));check(Number.isSafeInteger(draftNumber),'The local snapshot sequence could not be checked.');const row={document,commit:digest(document),baseRevision,previews};await writeFile(join(directory,`draft-${draftNumber}.json`),JSON.stringify(row),{flag:'wx'});return{draftNumber};});},
  async operation(args){
   if(args.action==='drafts'){let names;try{names=await readdir(directory);}catch(error){if(error.code==='ENOENT')return{drafts:[]};throw error;}const numbers=names.filter(name=>/^draft-\d+\.json$/.test(name)).map(name=>Number(name.slice(6,-5))).sort((a,b)=>b-a);return{drafts:await Promise.all(numbers.map(async number=>{const row=await record(number);return{number,title:row.document.pages[0].title};}))};}
   if(args.action==='open'||args.action==='status')return status(args.draftNumber);
   if(args.action==='publication'){const document=await release();return{state:digest(document)===args.revision?'live':'pending'};}
   if(args.action==='publish')return locked(async()=>{const value=await status(args.draftNumber);check(value.commit===args.expectedCommit&&value.baseRevision===args.baseRevision&&value.canPublish&&args.confirmation==='Publish this previewed revision','The preview or published revision changed. Reopen and check the draft.');const filename=join(directory,`release-${randomUUID()}.json`);try{await writeFile(filename,JSON.stringify(value.document),{flag:'wx'});await rename(filename,join(directory,'release.json'));return{revision:value.commit};}catch(error){error.uncertain=true;throw error;}finally{await rm(filename,{force:true});}});
   throw Error('Choose a supported local proof operation.');
  },
  async saved(number){return record(number);},release
 };
}
