import assert from 'node:assert/strict';
import {summarizeCapture} from './audit-morning-capture-outcomes.mjs';
const x=summarizeCapture({date:'20261118',captureTimeJst:'17:42',records:[
 {error:'The operation was aborted due to timeout'},
 {error:'connection reset'},
 {httpStatus:503},
 {httpStatus:200,response:{ready:false,reason:'official_six_boat_stats_unverified'}},
 {httpStatus:200,response:{ready:true,missingInputs:['last50','weather','weather']}},
 {httpStatus:200,response:{ready:true,missingInputs:[]}},
 {httpStatus:200,response:{ready:true}}
]});
assert.deepEqual(x.counts,{attempted:7,networkTimeout:1,otherNetworkError:1,httpFailure:1,notReady:1,ready:3,readyWithMissingInputs:1,readyWithNoReportedMissingInputs:1});
assert.deepEqual(x.missingInputLabels,{last50:1,weather:1});
assert.equal(x.notReadyReasons.official_six_boat_stats_unverified,1);
assert.equal(x.authenticatedBeforeRace,false);
assert.equal(x.accuracyCalculationPermitted,false);
console.log('Morning capture diagnostics passed');
