import {escapeHTML as esc} from './fact.mjs';
const dates=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export const performanceDate=value=>dates.format(new Date(value));
export function performanceView(block,context={}){
 const data=context.managerPerformance;
 const profile=data?.profiles&&Object.hasOwn(data.profiles,block.manager)?data.profiles[block.manager]:null;
 if(!profile)throw Error('Choose a published manager from the researched register.');
 const tenures=[...profile.tenures].sort((a,b)=>a.firstMatchDate.localeCompare(b.firstMatchDate));
 const rows=[...tenures.map(t=>({label:`${t.role==='caretaker'?'Caretaker':'Permanent'} · ${performanceDate(t.firstMatchDate)} – ${performanceDate(t.lastMatchDate)}`,summary:t.summary})),{label:'All recorded spells',summary:profile.summary}];
 return {profile,tenures,rows,sourceSha256:data.sourceSha256,checked:data.checkedAt?performanceDate(data.checkedAt):'Check date not supplied',evidence:`Result evidence: ${profile.summary.evidence.crosschecked} crosschecked, ${profile.summary.evidence['single-source']} single-source, ${profile.summary.evidence.unclassified} unclassified. Tenure-boundary evidence is recorded separately below.`};
}
export const performanceColumns=[['played','Matches'],['W','Won'],['D','Drawn'],['L','Lost'],['gf','Goals for'],['ga','Goals against'],['winPercent','Win %']];
export const performanceValue=(summary,key)=>key==='winPercent'?(summary[key]===null?'—':`${summary[key].toFixed(2)}%`):String(summary[key]);
export const performanceScope='Recorded competitive matches only. Wartime, recovery and annulled fixtures are excluded. These are archive totals, not a claim of complete career coverage.';
export const performanceSemantics='Scores after extra time determine wins, draws and losses where recorded. Shootouts decide progression separately. Win percentage is wins divided by counted matches.';
export function renderManagerPerformance(block,context){
 const view=performanceView(block,context),a=esc(block.anchor),h=esc(block.heading).replaceAll('\n','<br>');
 return `<section class="wrap section manager-performance" id="${a}" aria-labelledby="${a}-title" data-archive-sha="${esc(view.sourceSha256)}"><h2 id="${a}-title">${h}</h2><p>${esc(performanceScope)}</p>${view.profile.researchNotes.map(note=>`<p class="manager-performance-warning"><strong>Open research question.</strong> ${esc(note)}</p>`).join('')}<div class="manager-performance-scroll" role="region" aria-label="${esc(view.profile.name)} recorded performance" tabindex="0"><table><caption>${esc(view.profile.name)} · recorded results by spell</caption><thead><tr><th scope="col">Spell</th>${performanceColumns.map(([,label])=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${view.rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th>${performanceColumns.map(([key])=>`<td>${esc(performanceValue(row.summary,key))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${esc(performanceSemantics)}</p><p>${esc(view.evidence)}</p><p>Archive checked: ${esc(view.checked)}. <a href="/data/results.json">Match records and source credits</a>.</p><details><summary>Match boundaries and sources</summary>${view.tenures.map(t=>`<h3>${esc(t.role==='caretaker'?'Caretaker':'Permanent')} · ${esc(performanceDate(t.firstMatchDate))} – ${esc(performanceDate(t.lastMatchDate))}</h3><p>${esc(t.note)}</p><p>Boundary evidence: ${esc(t.evidenceStatus)}.</p><ul>${t.sources.map(s=>`<li><a href="${esc(s.url)}">${esc(s.label)}</a></li>`).join('')}</ul>`).join('')}</details></section>`;
}
