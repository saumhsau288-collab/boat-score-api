// Research-only bridge into the existing strict official validator.
// Only explicitly verified extracted fields may be promoted.
import {buildVerifiedScoringInputs} from './boat-score-2-scoring-input-research.js';
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
export function validateResearchRacersForExistingPipeline(extraction) {
 const normalized=buildVerifiedScoringInputs(extraction);
 if(!normalized.ready)return {verified:false,reason:normalized.reason,racers:[]};
 if(normalized.racers.some(r=>typeof r.name!=='string'||!r.name.trim()))
  return {verified:false,reason:'verified_racer_name_required',racers:[]};
 const official=normalized.racers.map(r=>({
  boat:r.boat,racerId:r.racerId,name:r.name,
  nationalWinRate:r.nationalWinRate,localWinRate:r.localWinRate,
  motorTwoWinRate:r.motorTwoWinRate,sourceVerified:true
 }));
 return validateOfficialMetrics(official);
}
