import assert from 'node:assert/strict';
import {summarizeCaptureReadiness} from './report-capture-readiness-research.mjs';
const capture={date:'20261118',records:[
 {venue:1,response:{ready:true,rankedScores:[1,2,3,4,5,6]},receivedAt:'2026-11-17T23:00:00Z'},
 {venue:1,response:{ready:true,rankedScores:[]},receivedAt:'2026-11-18T09:00:00Z'},
 {venue:2,response:{ready:true},receivedAt:null},
 {venue:2,response:{ready:false}}
]};
const x=summarizeCaptureReadiness(capture);
assert.equal(x.counts.attempted,4);
assert.equal(x.counts.ready,3);
assert.equal(x.counts.failedOrNotReady,1);
assert.equal(x.counts.missingReceiveTime,1);
assert.equal(x.counts.capturedOutsideMorningWindow,1);
assert.equal(x.counts.missingRankedScores,2);
assert.equal(x.counts.missingSixOriginalInputs,3);
assert.equal(x.byVenue['1'].ready,2);
assert.equal(x.eligibleForWeightTuning,0);
assert.throws(()=>summarizeCaptureReadiness({}),/records/);
console.log('Capture readiness research tests passed');
