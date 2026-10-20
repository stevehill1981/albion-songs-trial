import {ALBION,perspective,summarize} from '../../public/results-core.mjs';
export const LEDGERS=['competitive','wartime','annulled'];
export const SCOPES=['season','opponent','competition','manager','tenure'];
export const MAX_CANDIDATES=250;
export const PAGE_SIZE=25;
export class ArchiveError extends Error {}
const requireValue=(ok,message)=>{if(!ok)throw new ArchiveError(message);};
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
const sourceURL=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}};
export function adaptArchive(ledger,data){
 requireValue(LEDGERS.includes(ledger)&&Array.isArray(data.matches)&&data.matches.length>0,'The archive ledger is missing or empty.');
 const seen=new Set();
 const matches=data.matches.map(original=>{
  requireValue(validDate(original.date)&&[original.home,original.away].filter(c=>c===ALBION).length===1&&[original.hg,original.ag].every(n=>Number.isInteger(n)&&n>=0)&&typeof original.season==='string'&&typeof original.competition==='string','Invalid archived fixture.');
  const originalId=original.id||[original.date,original.home,original.away,original.competition].join('|');
  const id=`${ledger}:${originalId}`;requireValue(!seen.has(id),'Duplicate archived fixture.');seen.add(id);
  const sourceRecord=data.sources?.[original.source];
  requireValue(sourceRecord?sourceURL(sourceRecord.url):sourceURL(original.source),'The match source is unresolved.');
  requireValue(!original.evidenceStatus||['single-source','crosschecked'].includes(original.evidenceStatus),'Unknown match evidence label.');
  return {...original,id,originalId,ledger,...perspective(original),evidenceStatus:original.evidenceStatus||'unclassified',sourceRecord:sourceRecord||{url:original.source}};
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 return {ledger,matches,checkedAt:data.checkedAt||null,currentSeason:data.currentSeason||null,coverage:data.coverage||data.note||null,coverageNotes:data.coverageNotes||[],pending:data.pending||[],sources:data.sources||{},limitations:'Published snapshot, not live scores. Recorded coverage only; club formation in 1878 does not imply complete results from 1878. Competitive, wartime/recovery and annulled ledgers must not be combined silently. Unclassified evidence is not a claim of independent corroboration.'};
}
export function matchSummary(matches){
 const totals=summarize(matches),evidence={crosschecked:0,'single-source':0,unclassified:0};
 for(const match of matches)evidence[match.evidenceStatus]++;
 return {...totals,winPercent:totals.played?Number((100*totals.W/totals.played).toFixed(2)):null,evidence,firstDate:matches.length?matches.at(-1).date:null,lastDate:matches[0]?.date||null,semantics:'W/D/L uses the score after extra time where recorded. Shootouts decide progression separately. Win percentage = wins / counted matches × 100. No league points, positions or honours inferred.'};
}
export function archiveGroups(archive){
 const groups=[{scope:'all',value:'all',matches:archive.matches}];
 for(const scope of SCOPES){const values=new Map();for(const match of archive.matches){const value=match[scope];if(value===undefined)continue;if(!values.has(value))values.set(value,[]);values.get(value).push(match);}for(const [value,matches]of values)groups.push({scope,value,matches});}
 return groups;
}
export function validateQuery(query){
 requireValue(query&&typeof query==='object'&&!Array.isArray(query),'Supply named archive filters.');
 const allowed=['ledger',...SCOPES,'from','to','venue','outcome','evidence','page'];
 requireValue(Object.keys(query).every(k=>allowed.includes(k)),'Unknown archive filter.');
 requireValue(LEDGERS.includes(query.ledger),'Choose competitive, wartime or annulled explicitly.');
 for(const key of SCOPES)if(query[key]!==undefined)requireValue(typeof query[key]==='string'&&query[key].trim().length>0&&query[key].length<=120,`Choose an exact ${key} from archive_coverage.`);
 for(const key of ['from','to'])if(query[key]!==undefined)requireValue(validDate(query[key]),'Use a valid YYYY-MM-DD date.');
 requireValue(!query.from||!query.to||query.from<=query.to,'The start date is after the end date.');
 for(const [key,values]of [['venue',['H','A','N']],['outcome',['W','D','L']],['evidence',['crosschecked','single-source','unclassified']]])if(query[key]!==undefined)requireValue(values.includes(query[key]),`Unknown ${key} filter.`);
 requireValue(query.page===undefined||Number.isSafeInteger(query.page)&&query.page>=1&&query.page<=1000,'Choose a positive page number, up to 1000.');
 const aliases={wolves:'Wolverhampton Wanderers',villa:'Aston Villa',birmingham:'Birmingham City'};
 return {...query,...(query.opponent?{opponent:aliases[query.opponent.toLowerCase()]||query.opponent}:{})};
}
export function planQuery(catalog,query){
 const filters=validateQuery(query),scopes=SCOPES.filter(key=>filters[key]!==undefined);
 const candidates=scopes.map(scope=>{const group=catalog.groups.find(g=>g.scope===scope&&g.value===filters[scope]);requireValue(group,`Unknown ${scope}. Read archive_coverage for recorded values; an absent scope is not a zero-result query.`);return group;});
 const group=candidates.sort((a,b)=>a.count-b.count)[0]||catalog.groups.find(g=>g.scope==='all');
 requireValue(group,'The archive catalog is incomplete.');
 const residual=scopes.length>1||['from','to','venue','outcome','evidence'].some(key=>filters[key]!==undefined);
 requireValue(!residual||group.count<=MAX_CANDIDATES,'This combined query is too broad. Choose one season or a smaller opponent/competition scope (at most 250 candidate matches). No partial totals were calculated.');
 return {filters,group,residual};
}
export function refineMatches(matches,filters){return matches.filter(m=>SCOPES.every(key=>filters[key]===undefined||m[key]===filters[key])&&(!filters.from||m.date>=filters.from)&&(!filters.to||m.date<=filters.to)&&(!filters.venue||m.venue===filters.venue)&&(!filters.outcome||m.outcome===filters.outcome)&&(!filters.evidence||m.evidenceStatus===filters.evidence));}
