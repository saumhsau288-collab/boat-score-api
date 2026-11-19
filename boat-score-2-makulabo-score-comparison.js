// Offline comparison only. Do not substitute finish rates for missing official inputs.
import {evaluateRace} from './boat-score-2-scoring.js';
export function compareMakulaboWithScores(joined,scoringInputs,provenance) {
 // Historical prediction comparison requires independent proof that all inputs
 // were available before the race deadline. A current page is not such proof.
 if(provenance?.preRaceVerified!==true || provenance?.allInputsPreRaceVerified!==true ||
    !/^20\\d{6}$/.test(String(provenance?.raceDate??'')))
  return {status:'pre_race_evidence_required',racers:[],scoreChangeApplied:false};
 if(joined?.verified!==true||!Array.isArray(joined.racers)||joined.racers.length!==6)
  return {status:'unverified_identity',racers:[],scoreChangeApplied:false};
 if(!Array.isArray(scoringInputs)||scoringInputs.length!==6||
    new Set(scoringInputs.map(r=>r.boat)).size!==6)
  return {status:'missing_scoring_inputs',racers:[],scoreChangeApplied:false};
 const aligned=joined.racers.map(r=>{
  const input=scoringInputs.find(x=>x.boat===r.boat && String(x.racerId)===r.racerId);
  return input?{...input,recent50WinRate:r.firstPlaceRate}:null;
 });
 if(aligned.some(x=>x===null))return {status:'racer_id_mismatch',racers:[],scoreChangeApplied:false};
 const evaluated=evaluateRace(aligned);
 return {status:evaluated.status,racers:joined.racers.map((r,i)=>({
  boat:r.boat,racerId:r.racerId,firstPlaceRate:r.firstPlaceRate,top3Rate:r.top3Rate,
  score:evaluated.racers[i].score,scoreStatus:evaluated.racers[i].status,
  missing:evaluated.racers[i].missing??[]
 })),scoreChangeApplied:false,
 warning:'Overall recent finish rates are compared, not proven pre-race available or course-specific.'};
}
