#!/usr/bin/env node
// Research-only cross-source audit. Diagnostic counts never authorize scoring.
import fs from 'node:fs';
export function auditResearchSample(official,makulabo){
 const racers=Array.isArray(official?.racers)?official.racers:[];
 const samples=Array.isArray(makulabo?.finishSample?.racers)?makulabo.finishSample.racers:[];
 const officialIds=new Set(racers.map(r=>String(r.racerId)));
 const sampleIds=new Set(samples.map(r=>String(r?.racerId??'')));
 const idsMatch=racers.length===6&&samples.length===6&&officialIds.size===6&&sampleIds.size===6&&
  racers.every(r=>samples.some(s=>s.boat===r.boat&&String(s.racerId)===String(r.racerId)&&s.sourceVerified===true));
 const identitySafe=official?.status==='captured_research_inputs'&&idsMatch&&
  makulabo?.identityReview?.verified===true&&makulabo?.status!=='held';
 const byBoat=new Map(samples.map(r=>[r.boat,r]));
 const rows=racers.map(r=>{
  const s=byBoat.get(r.boat);
  const runs=s?.runs;
  const valid=Number.isInteger(runs)&&runs>=1&&runs<=50&&s?.finishCountsValid===true&&
   Array.isArray(s.finishCounts)&&s.finishCounts.length===6&&
   s.finishCounts.every(n=>Number.isInteger(n)&&n>=0)&&s.finishCounts.reduce((a,b)=>a+b,0)===runs;
  return {boat:r.boat,racerId:String(r.racerId),officialName:r.name,sourceName:s?.sourceName??null,
   registrationIdMatched:Boolean(s&&s.sourceVerified===true&&String(s.racerId)===String(r.racerId)),
   runs:valid?runs:null,sampleValid:valid,exactly50:valid&&runs===50,
   insufficientSample:!valid||runs<50};
 });
 const sampleBoatsUnique=samples.length===6&&new Set(samples.map(r=>r.boat)).size===6;
 const complete=sampleBoatsUnique&&rows.length===6&&rows.every(r=>r.sampleValid&&r.exactly50);
 return {status:'research_sample_audit_only',date:official?.date??null,venue:official?.venue??null,
  race:official?.race??null,rows,allExactly50:complete,identitySafe,
  eligibleForCalibration:false,readyForResearchMorningScoring:false,
  reasons:[...(!sampleBoatsUnique?['six_unique_sample_boats_required']:[]),
   ...(!idsMatch?['six_source_verified_registration_id_matches_required']:[]),
   ...(!identitySafe?['identity_not_independently_verified']:[]),
   ...(!complete?['not_all_six_have_exactly_50_verified_finish_counts']:[]),
   'finish_counts_do_not_prove_pre_race_recent50'],
  note:'No first-place rates are used as prediction inputs. This report is not a prediction.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [officialPath,makulaboPath]=process.argv.slice(2);
 if(!officialPath||!makulaboPath)throw Error('Usage: node scripts/audit-research-sample.mjs official.json makulabo.json');
 console.log(JSON.stringify(auditResearchSample(JSON.parse(fs.readFileSync(officialPath,'utf8')),JSON.parse(fs.readFileSync(makulaboPath,'utf8'))),null,2));
}
