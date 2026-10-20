import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {attributeManagers,validateTenure,validateManager} from '../src/lib/manager-history.mjs';
import {adaptArchive,matchSummary} from '../src/lib/match-archive.mjs';
const folder=async path=>Promise.all((await readdir(path)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path+'/'+f,'utf8'))));
const register={managers:await folder('content/managers'),tenures:await folder('content/manager-tenures')};
const archive=adaptArchive('competitive',JSON.parse(await readFile('public/data/results.json','utf8')));
const result=attributeManagers(archive,register);
test('caretaker and permanent spells remain disjoint, and all rows reconcile including unassigned history',()=>{
 const moore=result.managerProfiles.find(p=>p.id==='darren-moore');assert.equal(moore.tenures.length,2);assert.deepEqual(moore.tenures.map(t=>t.role).sort(),['caretaker','permanent']);
 const interim=moore.tenures.find(t=>t.role==='caretaker');assert.equal(interim.summary.played,6);assert.deepEqual([interim.summary.W,interim.summary.D,interim.summary.L],[3,2,1]);
 const total=matchSummary(result.matches),assigned=result.attributionCoverage.assigned,unassigned=result.attributionCoverage.unassigned;
 for(const key of ['played','W','D','L','gf','ga']){assert.equal(assigned[key]+unassigned[key],total[key]);assert.equal(result.managerProfiles.reduce((sum,p)=>sum+p.summary[key],0),assigned[key]);assert.equal(moore.tenures.reduce((sum,t)=>sum+t.summary[key],0),moore.summary[key]);}
 assert.equal(result.matches.length,archive.matches.length);assert(archive.matches.every(m=>m.manager===undefined),'Attribution cannot rewrite canonical archive rows');
});
test('repeat appointments and delayed first-match handover use actual match boundaries',()=>{
 const mowbray=result.managerProfiles.find(p=>p.id==='tony-mowbray');assert.equal(mowbray.tenures.length,2);
 assert.equal(result.matches.find(m=>m.date==='2025-01-18').manager,'unassigned','Brunt took Stoke after Mowbray was announced');
 assert.equal(result.matches.find(m=>m.date==='2025-01-21').tenure,'tony-mowbray-2025');assert.equal(result.matches.find(m=>m.date==='2025-04-21').tenure,'tony-mowbray-2025');
 assert.equal(mowbray.tenures.find(t=>t.id==='tony-mowbray-2025').summary.played,17);
 assert(mowbray.researchNotes.some(n=>n.includes('139')&&n.includes('140')),'An unresolved source-total discrepancy must stay visible');
 for(const m of result.matches)assert.equal(m.evidenceStatus,archive.matches.find(a=>a.id===m.id).evidenceStatus,'Attribution must not upgrade match evidence');
});
test('overlaps, missing sources, guessed boundary matches and invalid exceptions stop the build',()=>{
 const overlap=structuredClone(register);overlap.tenures.push({...overlap.tenures[0],id:'overlap'});assert.throws(()=>attributeManagers(archive,overlap),/Overlapping/);
 const missing=structuredClone(register);missing.tenures.find(t=>t.id==='steve-clarke-2012').firstMatchDate='2012-08-17';assert.throws(()=>attributeManagers(archive,missing),/recorded/);
 const bad=structuredClone(register);bad.tenures[0].excludedMatchIds=['missing'];assert.throws(()=>attributeManagers(archive,bad),/exception/);
 assert.throws(()=>validateManager({...register.managers[0],unknown:true}),/Unknown/);
 assert.throws(()=>validateTenure({...register.tenures[0],sources:[]}),/sources/);
 assert.throws(()=>validateManager({...register.managers[0],biography:[{text:'Unverified',sources:[{label:'Unsafe',url:'javascript:alert(1)'}],evidenceStatus:'single-source'}]}),/source/);
});
