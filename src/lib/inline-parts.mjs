import {escapeHTML as esc} from './fact.mjs';
export function renderParts(parts){return parts.map(part=>{
 const t=esc(part.text);return part.type==='emphasis'?`<em>${t}</em>`:part.type==='strong'?`<strong>${t}</strong>`:part.type==='link'?`<a href="${esc(part.url)}">${t}</a>`:t;
}).join('');}
