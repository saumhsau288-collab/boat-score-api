import assert from 'node:assert/strict';
import {evaluateVerifiedMakulaboResearch as evaluate} from './evaluate-verified-makulabo-research.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'選手'+(i+1),
 sourceVerified:true,nationalWinRate:6.2,localWinRate:5.5,motorTwoWinRate:40}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',date:'20261120',
 venue:18,race:1,racers};
const parsedRows=racers.map(r=>({boat:r.boat,name:r.name,runs:4,counts:[2,1,1,0,0,0]}));
const source={verified:true,parsedRows:[...parsedRows].reverse()};
const joined=evaluate(snapshot,source);
assert.equal(joined.status,'makulabo_identity_joined');
assert.equal(joined.racers.length,6);
assert.equal(joined.racers[0].firstPlaceRate,50);
assert.equal(joined.morningScoreApplied,false);
assert.equal(joined.reason,'verified_recent50_win_rate_required_not_first_place_percentage');
assert.equal(joined.eligibleForCalibration,false);
assert.equal(evaluate({...snapshot,racers:racers.slice(1)},source).status,'held');
assert.equal(evaluate(snapshot,{...source,verified:false}).status,'held');
const winRates=racers.map(r=>({racerId:r.racerId,winRate:50,verified:true,sourceVerified:true}));
const scored=evaluate(snapshot,{...source,verifiedWinRates:winRates});
assert.equal(scored.status,'research_morning_evaluated');
assert.equal(scored.morningScoreApplied,true);
assert.equal(scored.score.status,'evaluated');
assert.equal(scored.eligibleForCalibration,false);
assert.equal(evaluate(snapshot,{...source,verifiedWinRates:winRates.map(r=>({...r,sourceVerified:false}))}).morningScoreApplied,false);
assert.equal(evaluate(snapshot,{...source,verifiedWinRates:[...winRates.slice(0,5),winRates[0]]}).morningScoreApplied,false);
console.log('Verified Makulabo research scoring bridge tests passed');
