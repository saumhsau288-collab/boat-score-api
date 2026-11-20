#!/usr/bin/env node
// Research-only cross-source audit. Diagnostic counts never authorize scoring.
import fs from 'node:fs';
export function auditResearchSample(official,makulabo){
 const racers=Array.isArray(official?.racers)?official.racers:[];
 const samples=Array.isArray(makulabo?.finishSample?.racers)?makulabo.finishSample.racers:[];
 const officialIds=new Set(racers.map(r=>String(r.racerId)));
 const sampleIds=new Set(samples.map(r=>String(r?.racerId??'')));
 const candidates=Array.isArray(makulabo?.identityReview?.candidates)?makulabo.identityReview.candidates:[];
 const candidateByBoat=new Map(candidates.map(c=>[c.boat,c]));
 const candidateBoatsUnique=candidates.length===6&&new Set(candidates.map(c=>c.boat)).size===6;
 const candidatesAlign= candidateBoatsUnique&&racers.every(r=>{
  const c=candidateByBoat.get(r.boat);
  return c?.sameLabelledBoat===true&&String(c.officialRacerId)===String(r.racerId)&&
   c.officialName===r.name&&c.sourceName===samples.find(x=>x.boat===r.boat)?.sourceName;
 });
 const idsMatch=racers.length===6&&samples.length===6&&officialIds.size===6&&sampleIds.size===6&&
  racers.every(r=>samples.some(s=>s.boat===r.boat&&String(s.racerId)===String(r.racerId)&&s.sourceVerified===true));
 const officialBoatsValid=racers.length===6&&new Set(racers.map(r=>r.boat)).size===6&&
  racers.every(r=>Number.isInteger(r.boat)&&r.boat>=1&&r.boat<=6&&r.sourceVerified===true);
 const manualReviewOutstanding=candidates.some(c=>c.manualReviewRequired===true)&&
  makulabo?.identityReview?.manualReviewApproved!==true;
 const identitySafe=official?.status==='captured_research_inputs'&&officialBoatsValid&&idsMatch&&candidatesAlign&&
  !manualReviewOutstanding&&
  makulabo?.identityReview?.verified===true&&makulabo?.status!=='held';
 const byBoat=new Map(samples.map(r=>[r.boat,r]));
 const rows=racers.map(r=>{
  const s=byBoat.get(r.boat);
  const runs=s?.runs;
  const valid=Number.isInteger(runs)&&runs>=1&&runs<=50&&s?.finishCountsValid===true&&
   Array.isArray(s.finishCounts)&&s.finishCounts.length===6&&
   s.finishCounts.every(n=>Number.isInteger(n)&&n>=0)&&s.finishCounts.reduce((a,b)=>a+b,0)===runs;
  const candidate=candidateByBoat.get(r.boat);
  return {boat:r.boat,racerId:String(r.racerId),officialName:r.name,sourceName:s?.sourceName??null,
   candidateMatchStatus:candidate?.matchStatus??null,
   manualReviewRequired:candidate?.manualReviewRequired??null,
   sourceRacerIdProvided:s?.racerId!=null,
   registrationIdMatched:Boolean(s&&s.sourceVerified===true&&String(s.racerId)===String(r.racerId)),
   runs:valid?runs:null,sampleValid:valid,exactly50:valid&&runs===50,
   insufficientSample:!valid||runs<50};
 });
 const sampleBoatsUnique=samples.length===6&&new Set(samples.map(r=>r.boat)).size===6;
 const countsConsistent=sampleBoatsUnique&&rows.length===6&&rows.every(r=>r.sampleValid);
 const complete=countsConsistent&&rows.every(r=>r.exactly50);
 return {status:'research_sample_audit_only',date:official?.date??null,venue:official?.venue??null,
  race:official?.race??null,rows,countsConsistent,allExactly50:complete,identitySafe,manualReviewOutstanding,
  eligibleForCalibration:false,readyForResearchMorningScoring:false,
  reasons:[...(!officialBoatsValid?['six_unique_source_verified_official_boats_required']:[]),
   ...(!sampleBoatsUnique?['six_unique_sample_boats_required']:[]),
   ...(!idsMatch?['six_source_verified_registration_id_matches_required']:[]),
   ...(!candidatesAlign?['candidate_identity_evidence_incomplete_or_mismatched']:[]),
   ...(manualReviewOutstanding?['explicit_manual_identity_review_required']:[]),
   ...(!identitySafe?['identity_not_independently_verified']:[]),
   ...(!countsConsistent?['finish_counts_inconsistent_or_missing']:[]),
   ...(!complete?['sample_sizes_not_all_50_diagnostic_only']:[]),
   'finish_counts_do_not_prove_pre_race_recent50'],
  note:'No first-place rates are used as prediction inputs. This report is not a prediction.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [officialPath,makulaboPath]=process.argv.slice(2);
 if(!officialPath||!makulaboPath)throw Error('Usage: node scripts/audit-research-sample.mjs official.json makulabo.json');
 console.log(JSON.stringify(auditResearchSample(JSON.parse(fs.readFileSync(officialPath,'utf8')),JSON.parse(fs.readFileSync(makulaboPath,'utf8'))),null,2));
}
