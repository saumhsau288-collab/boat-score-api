import assert from 'node:assert/strict';
import {inspectSavedMorningCapture} from './inspect-saved-morning-capture.mjs';
const result=inspectSavedMorningCapture({date:'20261123',records:[
 {date:'20261123',venue:1,race:1,receivedAt:'2026-11-23T00:00:00Z',
  response:{ready:true}},
 {date:'20261123',venue:1,race:2,receivedAt:'2026-11-23T00:00:00Z',
  response:{independentEvidence:{racers:[]}}}
]});
assert.equal(result.attempted,2);
assert.equal(result.eligibleForVerifiedAccuracy,0);
assert.equal(result.held,2);
assert.ok(Object.keys(result.reasons).length>0);
assert.throws(()=>inspectSavedMorningCapture({records:null}),/Capture records required/);
console.log('Read-only saved morning capture inspection tests passed');
