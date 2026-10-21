import assert from 'node:assert/strict';
// Inspect emitted JavaScript, rather than trusting an import/configuration change.
export function assertNoLegacyTemplates(sources,patterns){
 assert(sources.length>0,'No emitted Worker modules were checked.');
 assert(patterns.length>0,'No authoritative templates were checked.');
 for(const {name,source} of sources){
  assert(typeof source==='string'&&source.length>0,`Worker module ${name} is empty.`);
  for(const pattern of patterns){
   const html=pattern.template;
   assert(typeof html==='string'&&html.length>0,'A source template is missing.');
   const escaped=JSON.stringify(html).slice(1,-1),doubleEscaped=JSON.stringify(escaped).slice(1,-1);
   assert(![html,escaped,doubleEscaped].some(value=>source.includes(value)),`Legacy template ${pattern.name} leaked into Worker module ${name}.`);
  }
 }
}
