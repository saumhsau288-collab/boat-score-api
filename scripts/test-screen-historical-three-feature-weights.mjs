import assert from 'node:assert/strict';
import {screenHistoricalThreeFeatureWeights as screen} from './screen-historical-three-feature-weights.mjs';
const mk=(date,race)=>{
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,nationalWinRate:8-i,localWinRate:8-i,motorTwoWinRate:60-i*5}));
 return {racelist:{date,venue:'18',race,status:'official_racelist_source_captured',sixRacersParsed:true,racers},
 result:{verified:true,finishByBoat:racers.map((r,i)=>({boat:r.boat,racerId:r.racerId,finish:i+1}))}};
};
const insufficient=screen([mk('20261120',1)]);
assert.equal(insufficient.status,'held');
assert.equal(insufficient.reason,'insufficient_independent_history');
const data=[...Array.from({length:6},(_,i)=>mk('20261119',i+1)),...Array.from({length:6},(_,i)=>mk('20261120',i+1))];
const evaluated=screen(data,{minTrain:5,minHoldout:5});
assert.equal(evaluated.status,'historical_three_feature_research_only');
assert.equal(evaluated.trainRaces,6);
assert.equal(evaluated.holdoutRaces,6);
assert.equal(evaluated.eligibleForDeployment,false);
assert.equal(evaluated.proposedWeights,null);
assert.equal(screen([...data,mk('20261120',1)],{minTrain:5,minHoldout:5}).excluded.invalid_or_duplicate_identity,1);
console.log('Chronological three-feature weight screen tests passed');
