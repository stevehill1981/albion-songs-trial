import {validatePage} from './block-schema.mjs';
import {escapeHTML} from './fact.mjs';
export const componentTypes=['manager-performance','intro','text-panel','photograph','section'];
export function isComponentDraft(page){return Array.isArray(page?.blocks)&&page.blocks.every(block=>componentTypes.includes(block?.type)&&(block.type!=='section'||!Array.isArray(block.columns)||block.columns.every(column=>!Array.isArray(column?.blocks)||column.blocks.every(child=>['text-panel','photograph','manager-performance'].includes(child?.type)))));}
export function supportsAstroPage(page){return Array.isArray(page?.blocks)&&page.blocks.length>0&&page.blocks.every(block=>componentTypes.includes(block.type)&&(block.type!=='section'||Array.isArray(block.columns)&&block.columns.every(column=>Array.isArray(column.blocks)&&column.blocks.every(child=>['text-panel','photograph','manager-performance'].includes(child.type)))));}
export function validateComponentPage(page){
 // Bound the trial before walking the existing, more permissive editorial schema.
 if(!page||!Array.isArray(page.blocks)||page.blocks.length>20)throw Error('Use up to 20 blocks in the Astro preview trial.');
 const all=page.blocks.flatMap(block=>block?.type==='section'?[block,...(Array.isArray(block.columns)?block.columns.flatMap(column=>Array.isArray(column?.blocks)?column.blocks:[]):[])]:[block]);
 if(all.length>60||!supportsAstroPage(page))throw Error('This trial supports introductions, text, photographs, manager performance and columns.');
 // validatePage recursively validates blocks and column children already.
 validatePage(page);return page;
}
export function headingHTML(text='',emphasis=false){const lines=text.split('\n').map(escapeHTML);if(emphasis)lines[lines.length-1]=`<em>${lines.at(-1)}</em>`;return lines.join('<br>');}
