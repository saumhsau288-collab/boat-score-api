import assert from 'node:assert/strict';
import {auditNotReadyResponses} from './audit-not-ready-responses.mjs';
const a=auditNotReadyResponses([{date:'20261118',records:[
 {httpStatus:200,response:{ready:false,reason:'missing official input',officialStatsRetry:'official_http_403'}},
 {httpStatus:200,response:{ready:false}},
 {httpStatus:200,response:{ready:true,reason:'ignored'}},
 {httpStatus:403,response:{ready:false,reason:'ignored'}}
]}]);
assert.equal(a.total,2);
assert.equal(a.withReason,1);
assert.equal(a.withoutReason,1);
assert.equal(a.byReason['missing official input'],1);
assert.equal(a.fieldPresence.ready,2);
assert.equal(a.fieldPresence.officialStatsRetry,1);
assert.equal(a.byDay['20261118'].withoutReason,1);
assert.equal(auditNotReadyResponses([]).total,0);
console.log('PASS: not-ready response audit preserves missing diagnostic evidence');
