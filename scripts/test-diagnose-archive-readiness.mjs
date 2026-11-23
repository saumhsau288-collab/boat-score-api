import assert from 'node:assert/strict';
import {diagnoseArchiveReadiness} from './diagnose-archive-readiness.mjs';
const r=diagnoseArchiveReadiness([{records:[
 {date:'20261118',venue:2,race:1,httpStatus:200,response:{ready:false,reason:'source_unavailable'}},
 {date:'20261118',venue:2,race:2,httpStatus:null,error:'timeout'},
 {date:'20261118',venue:2,race:3,httpStatus:200,response:{ready:true}}
]}],['20261118:2:1']);
assert.deepEqual(r.totals,{ready:1,http_non_200:1,missing_response_object:0,http_200_not_ready:1});
assert.equal(r.nonReadyReasons.source_unavailable,1);
assert.equal(r.missingHttpDiagnosticFieldShapes['error,httpStatus'],1);
assert.equal(r.focused[0].category,'http_200_not_ready');
const retry=diagnoseArchiveReadiness([{records:[
 {date:'20261120',venue:2,race:1,httpStatus:200,response:{ready:true},attempts:[{attempt:1,error:'Timeout',requestedAt:'2026-11-20T00:00:00Z',receivedAt:'2026-11-20T00:00:20Z'},{attempt:2,httpStatus:200,requestedAt:'2026-11-20T00:00:20Z',receivedAt:'2026-11-20T00:00:21Z'}]},
 {date:'20261120',venue:2,race:2,httpStatus:200,response:{ready:false,reason:'source_unavailable'},attempts:[{attempt:1,error:'Timeout'},{attempt:2,httpStatus:200}]}
]}]);
assert.deepEqual(retry.successfulRetryReadiness,{ready:1,not_ready:1,unknown:0});
assert.equal(retry.attemptByOrdinal['1'].count,0); // failed HTTP captures only; success retries counted separately
console.log('PASS: archived readiness, missing HTTP metadata, and successful retry classification');
