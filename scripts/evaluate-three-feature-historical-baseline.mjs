// Diagnostic only: rank historical racers using the three available official
// metrics. This is NOT the current five-feature Boat Score 2 prediction.
import {joinHistoricalRacelistAndResults} from './join-historical-racelist-result-identities.mjs';
export function evaluateThreeFeatureHistoricalBaseline(racelist,result){
 const joined=joinHistoricalRacelistAndResults(racelist,result);
 if(joined.status!=='retrospective_racer_identity_join')
  return {status:'held',reason:joined.reason,eligibleForWeightTuning:false};
 const scored=joined.rows.map(r=>({...r,partialScore:
  45*r.nationalWinRate/10+
  25*(r.localWinRate===0?r.nationalWinRate:r.localWinRate)/10+
  15*r.motorTwoWinRate/100}));
 if(scored.some(r=>!Number.isFinite(r.partialScore)||r.nationalWinRate<0||r.nationalWinRate>10||
  r.localWinRate<0||r.localWinRate>10||r.motorTwoWinRate<0||r.motorTwoWinRate>100))
  return {status:'held',reason:'invalid_official_metrics',eligibleForWeightTuning:false};
 scored.sort((a,b)=>b.partialScore-a.partialScore||a.boat-b.boat);
 const winner=scored.find(r=>r.winner);
 return {status:'three_feature_diagnostic_only',date:racelist.date,venue:racelist.venue,race:racelist.race,
  firstPlaceCandidateRacerId:scored[0].racerId,actualWinnerRacerId:winner.racerId,
  firstPlaceCorrect:scored[0].racerId===winner.racerId,
  topThreePodiumHits:scored.slice(0,3).filter(r=>r.podium).length,
  scores:scored.map(r=>({racerId:r.racerId,boat:r.boat,partialScore:Math.round(r.partialScore*100)/100,finish:r.finish})),
  scoreWeightCoverage:85,missingScoreWeight:15,missingFeatures:['recent50WinRate','exhibitionScore'],
  currentFiveFeaturePrediction:false,historicalPreRaceValidityVerified:false,
  eligibleForWeightTuning:false,eligibleForDeployment:false};
}
