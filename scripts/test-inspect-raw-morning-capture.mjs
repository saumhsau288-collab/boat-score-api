import assert from 'node:assert/strict';
import {inspectRawMorningCapture as inspect} from './inspect-raw-morning-capture.mjs';
assert.equal(inspect(null).status,'invalid_raw_capture');
const rows=[{httpStatus:200,response:{ready:true,rankedScores:[1,2,3,4,5,6]}},
 {httpStatus:500,response:{ready:false}}];
const r=inspect({date:'20261120',authenticatedBeforeRace:false,records:rows});
assert.equal(r.counts.records,2);
assert.equal(r.counts.ready,1);
assert.equal(r.counts.originalSixInputsComplete,0);
assert.equal(r.counts.readyWithoutOriginalSixInputs,1);
assert.equal(r.eligibleForAccuracyAudit,0);
assert.equal(inspect({authenticatedBeforeRace:true,records:rows}).status,'invalid_raw_capture');
console.log('Raw morning artifact structural audit fixture passed');
