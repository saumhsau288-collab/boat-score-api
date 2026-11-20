// Research-only retrospective replay: score historical pre-result features NOW.
// No archived prediction is required. Never accept result-derived feature inputs.
import {evaluateRace,SCORE_WEIGHTS} from '../boat-score-2-scoring.js';
export function replayHistoricalRace({date,venue,race,featuresByBoat,finishByBoat,featureEvidence}={},weights=SCORE_WEIGHTS){
 const held=(reason)=>({status:'held',reason,eligibleForDeployment:false});
 if(!/^\d{8}$/.test(String(date??''))||!/^(?:[1-9]|1\d|2[0-4])$/.test(String(Number(venue)))||
  !Number.isInteger(race)||race<1||race>12)return held('invalid_race_identity');
 if(!featureEvidence||featureEvidence.historicalSourceVerified!==true||
  featureEvidence.resultIndependent===false||featureEvidence.resultIndependent!==true||
  !Array.isArray(featureEvidence.sources)||!featureEvidence.sources.length||
  featureEvidence.sources.some(s=>!s?.url||!s?.sha256||!s?.historicalValidityVerified))
  return held('historical_pre_result_features_not_authenticated');
 if(!Array.isArray(featuresByBoat)||featuresByBoat.length!==6||
  featuresByBoat.some((f,i)=>f?.boat!==i+1||!/^\d{4}$/.test(String(f.racerId)))||
  new Set(featuresByBoat.map(f=>String(f.racerId))).size!==6)return held('six_racer_features_missing');
 if(!Array.isArray(finishByBoat)||finishByBoat.length!==6||
  finishByBoat.some((f,i)=>f?.boat!==i+1||!/^\d{4}$/.test(String(f.racerId))||
   String(f.racerId)!==String(featuresByBoat[i].racerId)||!Number.isInteger(f.finish)||f.finish<1||f.finish>6)||
  new Set(finishByBoat.map(f=>f.finish)).size!==6)return held('official_finish_identity_mismatch');
 const scored=evaluateRace(featuresByBoat,weights);
 if(scored.status!=='evaluated')return held('required_historical_features_missing');
 const ranked=scored.racers.map((s,i)=>({...s,racerId:String(featuresByBoat[i].racerId)}))
  .sort((a,b)=>b.score-a.score||a.boat-b.boat);
 const actualWinner=finishByBoat.find(f=>f.finish===1);
 const actualPodium=new Set(finishByBoat.filter(f=>f.finish<=3).map(f=>String(f.racerId)));
 return {status:'retrospective_replay',date,venue:String(venue).padStart(2,'0'),race,
  predictionCreatedAfterRace:true,notAnArchivedPrediction:true,
  firstPlaceCandidate:ranked[0],rankedRacers:ranked,
  winnerRacerId:String(actualWinner.racerId),winnerCorrect:ranked[0].racerId===String(actualWinner.racerId),
  topThreePodiumHits:ranked.slice(0,3).filter(r=>actualPodium.has(r.racerId)).length,
  eligibleForDeployment:false,warning:'Retrospective in-sample replay. Evaluate weight changes on different races and dates.'};
}
