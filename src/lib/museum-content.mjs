import {readFile,readdir,access} from 'node:fs/promises';
import {validateIdentifier,validateURL} from './blocks.mjs';
import {renderMuseum} from './museum.mjs';
const string=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.length>20000)throw Error(`Complete ${label}.`);};
export async function loadMuseum(root){
 const folder=async name=>Promise.all((await readdir(new URL(`content/${name}/`,root))).filter(n=>n.endsWith('.json')).sort().map(async nameFile=>{
  const entry=JSON.parse(await readFile(new URL(`content/${name}/${nameFile}`,root),'utf8'));
  validateIdentifier(entry.id);if(nameFile!==`${entry.id}.json`)throw Error('Keep stable content identifiers unchanged.');return entry;
 }));
 const [exhibits,eras,sourceEntries,photoEntries,quiz,catalogue]=await Promise.all([folder('exhibits'),folder('eras'),folder('sources'),folder('photographs'),readFile(new URL('content/settings/quiz.json',root),'utf8').then(JSON.parse),readFile(new URL('content/settings/catalogue.json',root),'utf8').then(JSON.parse)]);
 if(!exhibits.length||!eras.length||!sourceEntries.length||!photoEntries.length)throw Error('The museum collections must not be empty.');
 for(const [entries,order]of [[exhibits,catalogue.exhibits],[eras,catalogue.eras],[photoEntries,catalogue.photographs]]){if(!Array.isArray(order)||new Set(order).size!==order.length||order.some(id=>!entries.some(e=>e.id===id)))throw Error('Check the catalogue ordering references.');entries.sort((a,b)=>{const i=order.indexOf(a.id),j=order.indexOf(b.id);return(i<0?99999:i)-(j<0?99999:j);});}
 const sources=Object.fromEntries(sourceEntries.map(s=>{string(s.label,'source label');validateURL(s.url);return[s.id,[s.label,s.url]];}));
 const images=Object.fromEntries(photoEntries.map(p=>{
  for(const key of ['file','alt','caption','author','licence'])string(p[key],`photograph ${key}`);
  if(!/^[a-zA-Z0-9.-]+\.(jpg|jpeg|png|webp)$/.test(p.file))throw Error('Choose a file from the verified photograph library.');
  for(const key of ['width','height'])if(!Number.isInteger(p[key])||p[key]<1||p[key]>20000)throw Error('Photograph dimensions are invalid.');
  validateURL(p.url);if(p.licenceUrl)validateURL(p.licenceUrl);return[p.id,p];
 }));
 await Promise.all(photoEntries.map(p=>access(new URL(`public/assets/${p.file}`,root))));
 const byId=new Map(exhibits.map(e=>[e.id,e]));
 for(const e of exhibits){
  for(const key of ['date','title','deck'])string(e[key],`exhibit ${key}`);
  if(!Number.isInteger(e.year)||e.year<1800||e.year>2200)throw Error('Check the exhibit year.');
  if(!['stories','matches','people','objects','places'].includes(e.type))throw Error('Choose a known exhibit category.');
  if(!eras.some(era=>era.id===e.era))throw Error(`Unknown exhibit era: ${e.id}.`);
  if(!Array.isArray(e.body)||e.body.length<2||e.body.length>50)throw Error('An exhibit needs at least two paragraphs.');e.body.forEach(p=>string(p,'exhibit paragraph'));
  e.sources??=[];e.related??=[];if(Array.isArray(e.score)&&e.score.length===0)delete e.score;
  if(!Array.isArray(e.sources)||!Array.isArray(e.related))throw Error('Choose source and related-story references.');
  if(!e.sources.length&&!e.imageSource)throw Error('Every exhibit needs supporting evidence.');
  e.sources.forEach(key=>{if(!Object.hasOwn(sources,key))throw Error(`Unknown source ${key}.`);});
  e.related.forEach(id=>{if(!byId.has(id)||id===e.id)throw Error(`Invalid related exhibit ${id}.`);});
  if(e.image&&!Object.hasOwn(images,e.image))throw Error('Choose a credited photograph.');
  if(e.score&&(!Array.isArray(e.score)||e.score.length!==3||e.score.some(v=>typeof v!=='string')))throw Error('Use the match board’s three text fields.');
 }
 for(const e of eras){
  for(const key of ['range','title','intro','year'])string(e[key],`era ${key}`);
  if(!Object.hasOwn(images,e.image)||!Array.isArray(e.featured)||e.featured.some(id=>!byId.has(id)))throw Error('Check the era photograph and featured exhibits.');
 }
 if(!Array.isArray(quiz.questions)||!quiz.questions.length||quiz.questions.length>50)throw Error('The quiz needs one to fifty questions.');
 for(const q of quiz.questions){string(q.question,'quiz question');string(q.explanation,'quiz explanation');if(!Array.isArray(q.answers)||q.answers.length<2||q.answers.length>6||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.answers.length)throw Error('Choose a valid correct answer.');q.answers.forEach(a=>string(a,'answer'));}
 if(!Array.isArray(catalogue.featured)||catalogue.featured.some(id=>!byId.has(id)))throw Error('Choose known featured exhibits.');
 const rendered=renderMuseum({exhibits,eras,sources,images,featured:catalogue.featured});
 return{...rendered,museumMarkup:rendered.markup,photographs:images,exhibits,eras,sourceEntries,photoEntries,quiz};
}
