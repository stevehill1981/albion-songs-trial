export function cloneLayout(blocks){return structuredClone(blocks);}
export function toEditorValue(value,field){
 const map=field.clear();const list=field.get('types').clear();
 const convert=item=>Array.isArray(item)?item.reduce((result,v)=>result.push(convert(v)),list):item&&typeof item==='object'?Object.entries(item).reduce((result,[key,v])=>result.set(key,convert(v)),map):item;
 return convert(value);
}
