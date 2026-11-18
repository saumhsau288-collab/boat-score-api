import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedVenueCandidates } from './verified-venue-candidates.mjs';

test('unverified, errored and unknown venues are excluded', () => {
  assert.deepEqual(verifiedVenueCandidates([
    {venue: 1, verified: false, reason: 'timeout'},
    {venue: 2, verified: true},
    {venue: 3, verified: undefined},
    {venue: 4, verified: 'true'},
  ]), [2]);
});

test('manual venue is not automatically considered verified', () => {
  assert.deepEqual(verifiedVenueCandidates([{venue: 7, verified: false}]), []);
  assert.deepEqual(verifiedVenueCandidates([{venue: 7, verified: true}]), [7]);
});

import { validTrifectaPicks, verifiedPodium, comparisonHoldReasons } from './backtest-comparison-eligibility.mjs';
const picks=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
test('six valid trifectas are required',()=>{
 assert.equal(validTrifectaPicks(picks),true);
 assert.equal(validTrifectaPicks(picks.slice(0,5)),false);
 assert.equal(validTrifectaPicks([...picks.slice(0,5),[1,1,2]]),false);
});
test('official podium requires six distinct, valid finish positions and verified flag',()=>{
 assert.equal(verifiedPodium({verified:true,finishOrder:[3,1,2,4,5,6]}),'3-1-2');
 assert.equal(verifiedPodium({verified:false,finishOrder:[3,1,2,4,5,6]}),null);
 assert.equal(verifiedPodium({verified:true,finishOrder:[3,1,2,4,5,5]}),null);
});
test('hold reasons distinguish prediction from official results',()=>{
 assert.deepEqual(comparisonHoldReasons({ready:true,main:picks,upset:picks},{verified:true,finishOrder:[1,2,3,4,5,6]}),[]);
 assert.deepEqual(comparisonHoldReasons({ready:true,main:picks,upset:picks},{verified:false,finishOrder:[1,2,3,4,5,6]}),['unverified_or_missing_result']);
 assert.deepEqual(comparisonHoldReasons({ready:false,main:[],upset:[]},{verified:true,finishOrder:[1,2,3,4,5,6]}),['prediction_not_ready','invalid_main_picks','invalid_upset_picks']);
});
