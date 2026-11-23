// Research-only: summarize a REAL raw morning artifact shape without claiming verified forecasts.
import {validateSixRacerSourceInputs} from './validate-six-racer-source-inputs.mjs';
const validPick=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(p).size===3;
export function inspectRawMorningCapture(payload){
 if(payload?.authenticatedBeforeRace!==false||!Array.isArray(payload?.records))
  return {status:'invalid_raw_capture'};
 const counts={records:payload.records.length,http200:0,ready:0,twelvePicksPresent:0,
  originalSixInputsComplete:0,readyWithoutOriginalSixInputs:0};
 for(const r of payload.records){
  if(r?.httpStatus===200)counts.http200++;
  if(r?.response?.ready!==true)continue;
  counts.ready++;
  const x=r.response;
  if(['main','upset'].every(k=>Array.isArray(x[k])&&x[k].length===6&&x[k].every(validPick)))
   counts.twelvePicksPresent++;
  if(validateSixRacerSourceInputs(x.scoreInputsByBoat).status==='complete_unverified_inputs')
   counts.originalSixInputsComplete++;
  else counts.readyWithoutOriginalSixInputs++;
 }
 return {status:'research_only',date:payload.date??null,counts,
  independentlyVerifiedPreRace:0,eligibleForAccuracyAudit:0,
  warning:'Counts are structural only. Raw morning artifact is explicitly unauthenticated; no historical hit-rate inference.'};
}
