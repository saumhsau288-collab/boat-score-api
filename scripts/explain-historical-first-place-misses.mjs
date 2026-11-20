// Explain misses without using actual finishing order to compute a prediction.
import {joinHistoricalRacelistAndResults} from './join-historical-racelist-result-identities.mjs';
import {evaluateThreeFeatureHistoricalBaseline} from './evaluate-three-feature-historical-baseline.mjs';
const KEYS=['nationalWinRate','localWinRate','motorTwoWinRate'];
const W={nationalWinRate:45,localWinRate:25,motorTwoWinRate:15};
const LIMIT={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100};
function components(r){
 const local=r.localWinRate===0?r.nationalWinRate:r.localWinRate;
 return Object.fromEntries(KEYS.map(k=>[k,Math.round((k==='localWinRate'?local:r[k])/LIMIT[k]*W[k]*100)/100]));
}
export function explainHistoricalFirstPlaceMiss(racelist,result){
 const base=evaluateThreeFeatureHistoricalBaseline(racelist,result);
 if(base.status!=='three_feature_diagnostic_only')return {status:'held',reason:base.reason};
 if(base.firstPlaceScoreTied)return {status:'tied_top_score',race:racelist.race,eligibleForWeightTuning:false};
 const joined=joinHistoricalRacelistAndResults(racelist,result);
 const predicted=joined.rows.find(r=>r.racerId===base.firstPlaceCandidateRacerId);
 const winner=joined.rows.find(r=>r.winner);
 const predictedComponents=components(predicted),winnerComponents=components(winner);
 const componentDifference=Object.fromEntries(KEYS.map(k=>[k,Math.round((winnerComponents[k]-predictedComponents[k])*100)/100]));
 return {status:base.firstPlaceCorrect?'correct':'miss',date:racelist.date,venue:racelist.venue,race:racelist.race,
  predicted:{racerId:predicted.racerId,boat:predicted.boat,finish:predicted.finish,
   nationalWinRate:predicted.nationalWinRate,localWinRate:predicted.localWinRate,motorTwoWinRate:predicted.motorTwoWinRate,
   scoreComponents:predictedComponents},
  actualWinner:{racerId:winner.racerId,boat:winner.boat,
   nationalWinRate:winner.nationalWinRate,localWinRate:winner.localWinRate,motorTwoWinRate:winner.motorTwoWinRate,
   scoreComponents:winnerComponents},
  winnerMinusPredictedComponents:componentDifference,
  missingFeatures:['recent50WinRate','exhibitionScore'],eligibleForWeightTuning:false,eligibleForDeployment:false};
}
