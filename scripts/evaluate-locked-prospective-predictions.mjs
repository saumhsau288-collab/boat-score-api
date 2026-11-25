import {assessProspectiveAdmission} from './assess-prospective-admission.mjs';

// Research-only: immutable pre-race predictions must be recorded before result matching.
// This module does not fetch, authenticate, persist or predict races.
const keyOf=r=>[r?.date,r?.venue,r?.race].join('-');
const explicitTime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const validOrder=o=>Array.isArray(o)&&o.length===6&&new Set(o).size===6&&o.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
const validTrifecta=o=>Array.isArray(o)&&o.length===3&&new Set(o).size===3&&o.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
export function evaluateLockedProspectivePredictions(predictions,results){
 if(!Array.isArray(predictions)||!Array.isArray(results))throw new TypeError('prediction and result arrays required');
 const admitted=new Map(),rejected=[],seen=new Set();
 for(const p of predictions){
  const k=keyOf(p);
  if(seen.has(k)){rejected.push({key:k,reason:'duplicate_prediction'});admitted.delete(k);continue;}
  seen.add(k);
  if(!/^20\d{6}$/.test(String(p?.date))||String(p.date)<'20261122'||!Number.isInteger(p?.venue)||!Number.isInteger(p?.race)){rejected.push({key:k,reason:'invalid_identity_or_date'});continue;}
  const gate=assessProspectiveAdmission(p.capture,p.verification);
  if(!gate.admitted){rejected.push({key:k,reason:gate.reason});continue;}
  if(gate.snapshot.date!==String(p.date)||gate.snapshot.venue!==p.venue||gate.snapshot.race!==p.race){rejected.push({key:k,reason:'capture_identity_mismatch'});continue;}
  if(Date.parse(p.verification.verifiedAt)>=Date.parse(gate.snapshot.scheduledStartAt)||Date.parse(p.verification.verifiedAt)>Date.parse(p.predictedAt)){rejected.push({key:k,reason:'source_verified_too_late'});continue;}
  if(!validTrifecta(p.predictedTrifecta)||p.predictedFirst!==p.predictedTrifecta[0]){rejected.push({key:k,reason:'invalid_prediction'});continue;}
  if(p.ruleVersion!=='inner-challenger-frozen-20261122'||!explicitTime(p.predictedAt)||Date.parse(p.predictedAt)>=Date.parse(gate.snapshot.scheduledStartAt)||Date.parse(p.predictedAt)<Date.parse(gate.snapshot.capturedAt)){rejected.push({key:k,reason:'rule_or_prediction_time_invalid'});continue;}
  if(!explicitTime(p.writtenAt)||Date.parse(p.writtenAt)<Date.parse(p.predictedAt)||Date.parse(p.writtenAt)>=Date.parse(gate.snapshot.scheduledStartAt)){rejected.push({key:k,reason:'write_time_invalid'});continue;}
  admitted.set(k,p);
 }
 const resultMap=new Map(),duplicates=new Set();
 for(const r of results){const k=keyOf(r);if(resultMap.has(k))duplicates.add(k);else resultMap.set(k,r);}
 const summary={admittedPredictions:admitted.size,matched:0,firstCorrect:0,exactTrifecta:0,unmatched:0,rejected:[...rejected],byDate:{},status:'NO_VERIFIED_MATCHES'};
 for(const [key,p] of admitted){
  if(duplicates.has(key)){summary.rejected.push({key,reason:'duplicate_result'});continue;}
  const r=resultMap.get(key);
  if(!r){summary.unmatched++;continue;}
  if(r.resultVerified!==true||!validOrder(r.finishOrder)){summary.rejected.push({key,reason:'unverified_result'});continue;}
  const first=p.predictedFirst===r.finishOrder[0],exact=p.predictedTrifecta.every((x,i)=>x===r.finishOrder[i]);
  summary.matched++;summary.firstCorrect+=Number(first);summary.exactTrifecta+=Number(exact);
  const d=summary.byDate[p.date]??={matched:0,firstCorrect:0,exactTrifecta:0};
  d.matched++;d.firstCorrect+=Number(first);d.exactTrifecta+=Number(exact);
 }
 if(summary.matched)summary.status='VERIFIED_RESULT_MATCHES_WITH_EXTERNALLY_ASSERTED_SOURCE';
 return summary;
}
