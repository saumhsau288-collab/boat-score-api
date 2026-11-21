// Research-only official 85-point component baseline.
// This is NOT the complete morning score, a probability, or a calibrated forecast.
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';

const round2=n=>Math.round(n*100)/100;
export function compareResearchOfficialBaseline(snapshot,finishComparison){
 if(snapshot?.status!=='captured_research_inputs'||snapshot?.source!=='verified_official_metrics'||
  !Array.isArray(snapshot.racers)||!validateOfficialMetrics(snapshot.racers).verified)
  return {status:'held',reason:'six_verified_official_racers_required',scoreChangeApplied:false};
 if(finishComparison?.status!=='descriptive_finish_comparison'||
  !Array.isArray(finishComparison.racers)||finishComparison.racers.length!==6||
  new Set(finishComparison.racers.map(r=>r.boat)).size!==6)
  return {status:'held',reason:'six_labelled_finish_samples_required',scoreChangeApplied:false};
 const rows=[];
 for(const racer of snapshot.racers){
  const sample=finishComparison.racers.find(r=>r.boat===racer.boat);
  if(!sample||!Number.isInteger(sample.runs)||sample.runs<1||sample.runs>50||
   ![sample.firstPlaceRate,sample.top2Rate,sample.top3Rate].every(n=>Number.isFinite(n)&&n>=0&&n<=100)||
   sample.firstPlaceRate>sample.top2Rate||sample.top2Rate>sample.top3Rate)
   return {status:'held',reason:'invalid_labelled_finish_sample',scoreChangeApplied:false};
  const local=racer.localWinRate===0?racer.nationalWinRate:racer.localWinRate;
  const official85=45*racer.nationalWinRate/10+25*local/10+15*racer.motorTwoWinRate/100;
  rows.push({boat:racer.boat,racerId:racer.racerId,name:racer.name,
   officialComponentScore85:round2(official85),officialComponentMax:85,
   localRateFallbackApplied:racer.localWinRate===0,
   labelledFrameSample:{runs:sample.runs,firstPlaceRate:sample.firstPlaceRate,
    top2Rate:sample.top2Rate,top3Rate:sample.top3Rate},
   recent50WinRateVerified:false,entryCourseVerified:false});
 }
 return {status:'research_official_component_comparison',date:snapshot.date,
  venue:snapshot.venue,race:snapshot.race,rows:rows.sort((a,b)=>a.boat-b.boat),
  scoreChangeApplied:false,eligibleForCalibration:false,
  note:'85-point official component only; finish percentages describe labelled-frame samples, not racer win-rate or predictive probabilities. No pre-race authentication.'};
}
