import assert from 'node:assert/strict';
import {evaluateThreeFeatureHistoricalBaseline as evaluate} from './evaluate-three-feature-historical-baseline.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,
 nationalWinRate:8-i,localWinRate:i===0?0:8-i,motorTwoWinRate:60-i*5}));
const finishByBoat=racers.map((r,i)=>({boat:r.boat,racerId:r.racerId,finish:i+1}));
const list={status:'official_racelist_source_captured',sixRacersParsed:true,racers,date:'20261120',venue:'18',race:1};
const ok=evaluate(list,{verified:true,finishByBoat});
assert.equal(ok.status,'three_feature_diagnostic_only');
assert.equal(ok.firstPlaceCorrect,true);
assert.equal(ok.topThreePodiumHits,3);
assert.equal(ok.scoreWeightCoverage,85);
assert.equal(ok.currentFiveFeaturePrediction,false);
assert.equal(ok.eligibleForWeightTuning,false);
assert.equal(evaluate(list,{verified:false,finishByBoat}).status,'held');
console.log('Three-feature historical baseline diagnostic tests passed');
