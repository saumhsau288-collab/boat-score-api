import assert from 'node:assert/strict';
import {auditMorningCapture} from './audit-morning-capture-evidence.mjs';
const capture={records:[
 {date:'20261123',venue:2,race:1,receivedAt:'2026-11-23T00:00:00Z',response:{ready:true,method:'legacy',rankedScores:[1,2,3,4,5,6]}},
 {date:'20261123',venue:2,race:2,receivedAt:'2026-11-23T00:01:00Z',response:{ready:false}}
]};
const result=auditMorningCapture(capture);
assert.equal(result.total,2);
assert.equal(result.eligibleCount,0);
assert.equal(result.heldCount,2);
assert.equal(result.heldReasons.unverified_provenance,2);
assert.equal(result.heldReasons.missing_six_racer_features,undefined);
assert.equal(result.heldReasons.invalid_six_racer_identity,2);
assert.throws(()=>auditMorningCapture({records:null}));
console.log('Legacy morning capture evidence audit passed');
