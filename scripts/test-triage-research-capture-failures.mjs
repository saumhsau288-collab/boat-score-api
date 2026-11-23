import assert from 'node:assert/strict';
import {triageResearchCaptureFailures} from './triage-research-capture-failures.mjs';
const report=triageResearchCaptureFailures([{date:'20261118',records:[
 {httpStatus:200,response:{ready:true}},
 {httpStatus:200,response:{ready:false}},
 {httpStatus:null,error:'timeout'},
 {httpStatus:403},
 {httpStatus:403}
]}]);
assert.equal(report.total,5);
assert.equal(report.ready,1);
assert.equal(report.notReadyOrFailed,4);
assert.equal(report.ranked[0].type,'http_403');
assert.equal(report.ranked[0].count,2);
assert.equal(report.ranked[0].sharePercent,40);
assert.equal(report.byDay['20261118'].total,5);
assert.equal(triageResearchCaptureFailures([]).total,0);
assert.equal(triageResearchCaptureFailures([]).ranked.length,0);
console.log('PASS: observed failure triage without inferred recovery or accuracy');
