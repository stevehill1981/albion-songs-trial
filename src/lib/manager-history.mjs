import {validDate,matchSummary,ArchiveError} from './match-archive.mjs';
const check=(ok,message)=>{if(!ok)throw new ArchiveError(message);};
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)&&value.length<=80;
function fields(record,keys){check(record&&typeof record==='object'&&!Array.isArray(record)&&Object.keys(record).every(key=>keys.includes(key)),'Unknown manager register field.');}
function sources(items){check(Array.isArray(items)&&items.length>0,'A manager claim needs sources.');for(const item of items){fields(item,['label','url']);let url;try{url=new URL(item.url);}catch{throw new ArchiveError('Invalid manager source URL.');}check(typeof item.label==='string'&&item.label.trim()&&url.protocol==='https:'&&!url.username&&!url.password,'Invalid manager source.');}}
export function validateManager(person){
 fields(person,['id','name','biography','researchNotes']);check(identifier(person.id)&&typeof person.name==='string'&&person.name.trim()&&person.name.length<=100,'Invalid manager identity.');
 check(Array.isArray(person.biography)&&person.biography.length>0&&Array.isArray(person.researchNotes)&&person.researchNotes.every(n=>typeof n==='string'&&n.trim()),'A manager needs sourced biography and research notes.');
 for(const claim of person.biography){fields(claim,['text','sources','evidenceStatus']);check(typeof claim.text==='string'&&claim.text.trim()&&['single-source','crosschecked'].includes(claim.evidenceStatus),'Invalid manager claim.');sources(claim.sources);check(claim.evidenceStatus!=='crosschecked'||claim.sources.length>=2,'Crosschecked claims need corroborating sources.');}
 return person;
}
export function validateTenure(tenure){
 fields(tenure,['id','manager','role','appointmentDate','departureDate','firstMatchDate','lastMatchDate','sources','note','evidenceStatus','ledger','excludedMatchIds']);
 check(identifier(tenure.id)&&identifier(tenure.manager)&&['permanent','caretaker'].includes(tenure.role)&&tenure.ledger==='competitive','Invalid tenure identity or scope.');
 check(validDate(tenure.firstMatchDate)&&validDate(tenure.lastMatchDate)&&tenure.firstMatchDate<=tenure.lastMatchDate,'Invalid tenure match boundary.');
 check(tenure.appointmentDate===null||validDate(tenure.appointmentDate)&&tenure.appointmentDate<=tenure.firstMatchDate,'Appointment must not follow the first match.');
 check(tenure.departureDate===null||validDate(tenure.departureDate)&&tenure.departureDate>=tenure.lastMatchDate,'Departure must not precede the last match.');
 check(typeof tenure.note==='string'&&tenure.note.trim()&&['single-source','crosschecked'].includes(tenure.evidenceStatus),'Tenure boundaries need explicit evidence and notes.');sources(tenure.sources);
 check(Array.isArray(tenure.excludedMatchIds)&&tenure.excludedMatchIds.every(id=>typeof id==='string')&&new Set(tenure.excludedMatchIds).size===tenure.excludedMatchIds.length,'Invalid tenure exceptions.');
 return tenure;
}
export function attributeManagers(archive,{managers,tenures}){
 managers.forEach(validateManager);tenures.forEach(validateTenure);
 check(new Set(managers.map(p=>p.id)).size===managers.length&&new Set(tenures.map(t=>t.id)).size===tenures.length,'Duplicate manager or tenure.');
 check(tenures.every(t=>managers.some(p=>p.id===t.manager)),'Unknown manager referenced by tenure.');
 const rows=archive.matches;
 for(const tenure of tenures){
  check(rows.some(m=>m.date===tenure.firstMatchDate)&&rows.some(m=>m.date===tenure.lastMatchDate),'Tenure boundaries must identify recorded competitive matches.');
  for(const id of tenure.excludedMatchIds)check(rows.some(m=>m.originalId===id&&m.date>=tenure.firstMatchDate&&m.date<=tenure.lastMatchDate),'An attribution exception must exist within its tenure.');
 }
 const matches=rows.map(match=>{
  const owners=tenures.filter(t=>match.date>=t.firstMatchDate&&match.date<=t.lastMatchDate&&!t.excludedMatchIds.includes(match.originalId));
  check(owners.length<=1,'Overlapping manager attribution; resolve the match explicitly.');
  return {...match,manager:owners[0]?.manager||'unassigned',tenure:owners[0]?.id||'unassigned'};
 });
 const profiles=managers.map(manager=>({...manager,tenures:tenures.filter(t=>t.manager===manager.id).map(t=>({...t,summary:matchSummary(matches.filter(m=>m.tenure===t.id))})),summary:matchSummary(matches.filter(m=>m.manager===manager.id)),scope:'Recorded competitive fixtures only. Match evidence and tenure-boundary evidence are separate. This three-profile register is a trial, not a complete list of Albion managers.'}));
 const assigned=matches.filter(m=>m.manager!=='unassigned');
 return {...archive,matches,managerProfiles:profiles,attributionCoverage:{researchedManagers:managers.length,researchedTenures:tenures.length,assigned:matchSummary(assigned),unassigned:matchSummary(matches.filter(m=>m.manager==='unassigned')),note:'Unassigned means no researched tenure in this trial register; it does not imply Albion had no manager. No wartime or annulled match is attributed by this competitive register.'}};
}
