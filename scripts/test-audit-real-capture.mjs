import assert from 'node:assert/strict';
import {auditRealCapture} from './audit-real-capture.mjs';
const r=auditRealCapture({date:'20261118',authenticatedBeforeRace:false,records:[{receivedAt:'2026-11-18T08:43:12Z',response:{ready:true,startAdjustmentApplied:true,exhibitionAdjustmentApplied:true,predictionChanged:true,missingInputs:['last50','course']}},{response:{ready:false}}]});
assert.equal(r.ready,1);assert.equal(r.attempted,2);assert.equal(r.startAdjusted,1);assert.equal(r.missingInputs.last50,1);assert.equal(r.firstReadyJst,'2026-11-18 17:43:12');assert.equal(r.accuracyPermitted,false);
console.log('Capture field audit tests passed');
