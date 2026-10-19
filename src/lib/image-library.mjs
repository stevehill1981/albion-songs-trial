import {escapeHTML as esc} from './fact.mjs';
import {photoURL} from './image-paths.mjs';
function sourceLink(url,label){try{const parsed=new URL(url);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)return `<a href="${esc(url)}">${esc(label)}</a>`;}catch{}return esc(label);}
export function renderPhoto(photo,{src=photoURL(photo.file),dimensions=true}={}){
 return `<figure class="library-photo"><img src="${esc(String(src))}" alt="${esc(photo.alt||'')}"${dimensions?` width="${photo.width}" height="${photo.height}"`:''} style="max-width:100%;height:auto;max-height:65vh;object-fit:contain" loading="lazy"><figcaption><strong>${esc(photo.caption||'')}</strong><br>${esc(photo.author||'')} · ${photo.licenceUrl?sourceLink(photo.licenceUrl,photo.licence||''):esc(photo.licence||'')} · ${sourceLink(photo.url||'','Image source')}</figcaption></figure>`;
}
export function renderImageLibrary(photos){
 return `<section class="wrap section image-library-page"><h1>Photographs &amp; credits</h1><p>Images from the museum, with their sources and credits. Choose a photograph to see its full record.</p><p><a href="/admin/#/collections/photographs">Open the image editor</a> · <a href="/pages">Explore the museum</a></p><div class="image-library-grid">${photos.map(p=>`<article><a href="/images/${esc(p.id)}"><img src="${esc(photoURL(p.file))}" width="${p.width}" height="${p.height}" alt="${esc(p.alt)}" loading="lazy"><h2>${esc(p.caption)}</h2></a><p>${esc(p.author)} · ${esc(p.licence)}</p></article>`).join('')}</div></section>`;
}
