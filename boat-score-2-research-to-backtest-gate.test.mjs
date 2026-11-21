import assert from 'node:assert/strict';
import {buildResearchFeatureSnapshot} from './boat-score-2-research-feature-snapshot.js';
import {evaluateSnapshot,calibrate,BASE_WEIGHTS} from './boat-score-2-calibration.js';

// Research data may be captured, but a recorder timestamp is not independent
// proof that the values were available before the race. Never silently promote
// this research snapshot to a historical backtest input.
const official=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4401+i),name:'Fixture '+(i+1),sourceVerified:true,
 nationalWinRate:6-i/10,localWinRate:i===0?0:5-i/10,motorTwoWinRate:40
}));
const captured=buildResearchFeatureSnapshot({
 date:'20261120',venue:2,race:9,capturedAt:'2026-11-19T23:00:00Z',official,
 courseByBoat:official.map(r=>({boat:r.boat,racerId:r.racerId,entryCourse:r.boat,verified:true})),
 recent50:official.map(r=>({racerId:r.racerId,firstPlaceRate:20,verified:true}))
});
assert.equal(captured.status,'captured_research_inputs');
assert.equal(captured.eligibleForCalibration,false);
assert.equal(captured.racers.length,6);
const claimedResult={...captured,finishOrder:[1,2,3,4,5,6],resultVerified:true};
assert.equal(evaluateSnapshot(claimedResult,BASE_WEIGHTS),null);
assert.equal(calibrate([claimedResult],{minTrain:1,minTest:1}).status,'insufficient_history');
assert.equal(captured.missing.includes('pre_race_source_authentication'),true);
assert.equal(captured.missing.includes('independently_verified_official_result'),true);
console.log('Research snapshot cannot be promoted to verified historical calibration');
