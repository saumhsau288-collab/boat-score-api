import assert from 'node:assert/strict';
import {diagnoseSavedPredictions} from './diagnose-saved-predictions.mjs';
const sample={results:[{date:'20261120',venue:17,race:1,response:{predictionMode:'base_stats_only'}},{date:'20261120',venue:21,race:6,response:{predictionMode:'base_stats_only'}}]};
const result=diagnoseSavedPredictions(sample);
assert.equal(result.status,'diagnosed');assert.equal(result.count,2);
assert.equal(result.rows.every(x=>x.verifiedCount===0&&x.requiredCount===6&&x.missingSources.length===6),true);
assert.equal(result.rows.every(x=>x.eligibleForCalibration===false),true);
assert.equal(diagnoseSavedPredictions({unexpected:true}).status,'held');
console.log('offline saved predictions: 2 rows held; invalid shape rejected');
