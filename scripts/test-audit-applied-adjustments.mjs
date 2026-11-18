import assert from 'node:assert/strict';
import {auditAppliedAdjustments} from './audit-applied-adjustments.mjs';
const r=auditAppliedAdjustments({records:[
{httpStatus:200,response:{ready:true,exhibitionAdjustmentApplied:true,startAdjustmentApplied:true,predictionChanged:true}},
{httpStatus:200,response:{ready:true,exhibitionAdjustmentApplied:false,startAdjustmentApplied:false,predictionChanged:false}},
{httpStatus:200,response:{ready:true,exhibitionAdjustmentApplied:true,predictionChanged:false}},
{httpStatus:200,response:{ready:false,exhibitionAdjustmentApplied:true}}
]});
assert.equal(r.ready,3);
assert.equal(r.exhibitionApplied,2);
assert.equal(r.startApplied,1);
assert.equal(r.bothApplied,1);
assert.equal(r.neitherApplied,1);
assert.equal(r.startUnknown,1);
assert.equal(r.predictionChangedTrue,1);
assert.equal(r.predictionChangedFalse,2);
console.log('Applied adjustment flag audit tests passed');
