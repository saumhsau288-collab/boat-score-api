import assert from 'node:assert/strict';
import {auditMissingInputs} from './audit-missing-inputs.mjs';
const out=auditMissingInputs([{records:[
 {httpStatus:200,response:{ready:false,officialStatsRetry:'official_timeout',missingInputs:['official','official','motor']}},
 {httpStatus:200,response:{ready:false,officialStatsRetry:'official_http_403',missingInputs:['official']}},
 {httpStatus:200,response:{ready:false,missingInputs:[]}},
 {httpStatus:200,response:{ready:true,missingInputs:['ignored']}}
]}]);
assert.equal(out.records,3);
assert.equal(out.counts.official,2);
assert.equal(out.counts.motor,1);
assert.equal(out.byRetry.official_timeout.inputs.official,1);
assert.equal(out.emptyArray,1);
assert.equal(auditMissingInputs([]).records,0);
console.log('PASS: missing input inventory deduplicates labels per record');
