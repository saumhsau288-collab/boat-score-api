import assert from 'node:assert/strict';
import {buildIndependentFeatureComparison} from './build-independent-feature-comparison.mjs';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),nationalWinRate:5.72,localWinRate:i===0?0:4.1,motor2Rate:32.67}));
const st=[{boat:1,racerId:'4001',verified:true,kind:'pre_race_average_st',value:0.15},{boat:2,racerId:'4002',verified:true,kind:'actual_st',value:0.01}];
const makulabo=[{boat:1,racerId:'4001',verified:true,scope:'same_labelled_frame_recent_up_to_50_all_venues',runs:49,firstPlaceRate:34.69},
 {boat:2,racerId:'4002',verified:true,scope:'overall_recent50',runs:50,firstPlaceRate:70}];
const result=buildIndependentFeatureComparison({official,averageST:st,makulabo});
assert.equal(result.status,'comparison_only');assert.equal(result.rows.length,6);
assert.equal(result.rows[0].localWinRateRaw,0);assert.equal(result.rows[0].localWinRateForScoring,5.72);
assert.equal(result.rows[0].preRaceAverageST,0.15);assert.equal(result.rows[1].preRaceAverageST,null);
assert.equal(result.rows[0].makulaboSameFrameRuns,49);assert.equal(result.rows[1].makulaboSameFrameFirstPlaceRate,null);
assert.equal(result.eligibleForCalibration,false);assert.equal(result.scoreChangeApplied,false);
assert.equal(buildIndependentFeatureComparison({official:official.slice(0,5)}).status,'held');
console.log('independent feature comparison: distinct inputs, missingness and local fallback passed');
