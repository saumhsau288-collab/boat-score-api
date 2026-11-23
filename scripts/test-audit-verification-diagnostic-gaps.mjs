import assert from 'node:assert/strict';
import {auditVerificationDiagnosticGaps} from './audit-verification-diagnostic-gaps.mjs';
const out=auditVerificationDiagnosticGaps([{date:'20261118',records:[
 {httpStatus:200,response:{ready:false,officialVerified:false,statsVerified:false,missingInputs:[],officialStatsRetry:'official_timeout'}},
 {httpStatus:200,response:{ready:false,officialVerified:false,missingInputs:['motor']}},
 {httpStatus:200,response:{ready:false,officialVerified:true,statsVerified:true,missingInputs:[]}},
 {httpStatus:200,response:{ready:true,officialVerified:false,missingInputs:[]}}
]}]);
assert.equal(out.examined,3);
assert.equal(out.unverified,2);
assert.equal(out.emptyMissingInputs,2);
assert.equal(out.unverifiedWithEmptyInputs,1);
assert.equal(out.byRetry.official_timeout,1);
assert.equal(out.byDay['20261118'].unverifiedWithEmptyInputs,1);
assert.equal(auditVerificationDiagnosticGaps([]).examined,0);
console.log('PASS: verification diagnostic gaps are counted without inventing missing inputs');
