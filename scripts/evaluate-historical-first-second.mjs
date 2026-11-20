// Historical ranking diagnostics for first and second places.
// Missing the current model's exhibition/recent50 inputs, so this is not
// a complete Boat Score 2 prediction or evidence to deploy weights.
import {joinHistoricalRacelistAndResults} from './join-historical-racelist-result-identities.mjs';
const score=r=>45*r.nationalWinRate/10+25*(r.localWinRate===0?r.nationalWinRate:r.localWinRate)/10+15*r.motorTwoWinRate/100;
export function evaluateHistoricalFirstSecond(racelist,result){
 const joined=joinHistoricalRacelistAndResults(racelist,result);
 if(joined.status!=='retrospective_racer_identity_join')
  return {status:'held',reason:joined.reason,eligibleForDeployment:false};
 const rows=joined.rows;
 if(rows.some(r=>!Number.isFinite(score(r))||r.nationalWinRate<0||r.nationalWinRate>10||
  r.localWinRate<0||r.localWinRate>10||r.motorTwoWinRate<0||r.motorTwoWinRate>100))
  return {status:'held',reason:'invalid_official_metrics',eligibleForDeployment:false};
 const ranked=[...rows].sort((a,b)=>score(b)-score(a)||a.boat-b.boat);
 const firstTied=Math.abs(score(ranked[0])-score(ranked[1]))<1e-9;
 const secondTied=Math.abs(score(ranked[1])-score(ranked[2]))<1e-9;
 return {status:'partial_first_second_diagnostic',date:racelist.date,venue:racelist.venue,race:racelist.race,
  firstCandidate:firstTied?null:ranked[0].racerId,secondCandidate:secondTied?null:ranked[1].racerId,
  firstTied,secondTied,firstCorrect:firstTied?null:ranked[0].finish===1,
  secondCorrect:secondTied?null:ranked[1].finish===2,
  secondCandidateActualFinish:secondTied?null:ranked[1].finish,
  secondCandidateWon:secondTied?null:ranked[1].finish===1,
  orderedPairCorrect:firstTied||secondTied?null:ranked[0].finish===1&&ranked[1].finish===2,
  actualFirst:rows.find(r=>r.finish===1)?.racerId,actualSecond:rows.find(r=>r.finish===2)?.racerId,
  predictionCreatedAfterRace:true,preRaceHistoricalValidityVerified:false,
  missingFeatures:['recent50WinRate','exhibitionScore'],eligibleForDeployment:false,eligibleForWeightTuning:false};
}
