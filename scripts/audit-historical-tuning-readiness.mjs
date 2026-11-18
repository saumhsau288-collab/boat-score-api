// Identify which actual historical races have the evidence required for honest weight tuning.
// No guessing missing fields and no substitution of post-race information.
import {FIELDS} from './tune-historical-weights-research.mjs';
export function auditHistoricalTuningReadiness(rows){
 if(!Array.isArray(rows))throw Error('Expected historical rows[]');
 const out={total:rows.length,ready:0,blocked:0,missing:{},races:[],warning:'Readiness only; true provenance flags and URLs must be independently checked against saved pre-race records.'};
 for(const r of rows){
  const missing=[];
  if(!/^20\d{6}$/.test(String(r?.date)))missing.push('date');
  if(!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12)missing.push('race_key');
  if(!Array.isArray(r?.actual)||r.actual.length!==3||new Set(r.actual).size!==3||r.actual.some(x=>!Number.isInteger(x)||x<1||x>6))missing.push('official_podium');
  if(r?.independentlyVerifiedResult!==true||!r?.officialResultSourceUrl)missing.push('official_result_evidence');
  if(r?.historicalInputProvenanceVerified!==true||!r?.historicalInputSourceUrl)missing.push('historical_input_evidence');
  if(!Number.isFinite(Date.parse(r?.historicalInputCapturedAt))||!Number.isFinite(Date.parse(r?.officialCutoffAt))||Date.parse(r.historicalInputCapturedAt)>=Date.parse(r.officialCutoffAt))missing.push('pre_cutoff_timing');
  if(!Array.isArray(r?.boats)||r.boats.length!==6||new Set(r.boats.map(b=>b?.boat)).size!==6)missing.push('six_boats');
  else for(const f of FIELDS)if(r.boats.some(b=>!Number.isFinite(b?.[f])))missing.push('six_boat_'+f);
  for(const key of missing)out.missing[key]=(out.missing[key]||0)+1;
  if(missing.length)out.blocked++;else out.ready++;
  out.races.push({date:r?.date??null,venue:r?.venue??null,race:r?.race??null,ready:missing.length===0,missing});
 }
 return out;
}
