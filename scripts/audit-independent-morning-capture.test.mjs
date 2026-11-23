import assert from 'node:assert/strict';
import {auditMorningCaptureForIndependentMethods} from './audit-independent-morning-capture.mjs';
const capture={date:'20261123',records:[
 {date:'20261123',venue:1,race:1,receivedAt:'2026-11-23T00:00:00Z',response:{ready:true,rankedScores:[1,2,3,4,5,6]}},
 {date:'20261123',venue:1,race:2,receivedAt:'2026-11-23T00:01:00Z',response:{ready:false}}
]};
const result=auditMorningCaptureForIndependentMethods(capture);
assert.equal(result.attempted,2);
assert.equal(result.eligibleForVerifiedAccuracy,0);
assert.equal(result.held,2);
assert.equal(result.missingSixRacerFeatures,2);
assert.throws(()=>auditMorningCaptureForIndependentMethods({}));
console.log('Morning capture adapter safely holds unverified API responses');
