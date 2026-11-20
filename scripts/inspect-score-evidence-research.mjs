// Research-only gate: distinguish observed score outputs from original pre-race features.
// This module never invents missing values or certifies race timing.
const FIELDS=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
const LIMITS={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100};
export function inspectScoreEvidence(capture){
 if(!Array.isArray(capture?.records))throw Error('records_required');
 const rows=capture.records.map(r=>{
  const response=r?.response;
  const boats=response?.scoreInputsByBoat;
  const validBoats=Array.isArray(boats)&&boats.length===6&&
   new Set(boats.map(b=>b?.boat)).size===6&&
   boats.every(b=>Number.isInteger(b?.boat)&&b.boat>=1&&b.boat<=6);
  const missingFields=validBoats?FIELDS.filter(f=>boats.some(b=>typeof b?.[f]!=='number'||!Number.isFinite(b[f])||b[f]<0||b[f]>LIMITS[f])):FIELDS;
  const complete=validBoats&&missingFields.length===0;
  const hasRankedScores=Array.isArray(response?.rankedScores);
  const reasons=[];
  if(response?.ready!==true)reasons.push('prediction_not_ready');
  if(!validBoats)reasons.push('six_original_score_inputs_missing');
  else if(missingFields.length)reasons.push('original_score_inputs_incomplete');
  if(capture?.authenticatedBeforeRace!==true||r?.authenticatedBeforeRace!==true)reasons.push('pre_race_authentication_missing');
  // Even a purported authentication flag is not independent verification.
  reasons.push('independent_official_cutoff_and_result_review_required');
  return {date:r?.date??null,venue:r?.venue??null,race:r?.race??null,
   ready:response?.ready===true,hasRankedScores,completeOriginalInputs:complete,
   missingFields,blockedReasons:reasons,eligibleForWeightTuning:false};
 });
 return {total:rows.length,ready:rows.filter(x=>x.ready).length,
  withRankedScores:rows.filter(x=>x.hasRankedScores).length,
  completeOriginalInputs:rows.filter(x=>x.completeOriginalInputs).length,
  eligibleForWeightTuning:0,rows,
  warning:'Read-only evidence inventory; rankedScores are not original inputs. No accuracy or tuning claims.'};
}
