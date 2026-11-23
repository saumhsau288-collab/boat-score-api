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
assert.equal(retry.attemptByOrdinal['1'],undefined); // failed HTTP captures only; success retries counted separately
const timing=diagnoseArchiveReadiness([{date:'20261120',records:[
 {date:'20261120',venue:1,race:1,requestedAt:'2026-11-20T00:00:05Z',httpStatus:200,response:{ready:true}},
 {date:'20261120',venue:1,race:6,requestedAt:'2026-11-20T00:00:01Z',httpStatus:200,response:{ready:false}},
 {date:'20261120',venue:1,race:7,requestedAt:'2026-11-20T00:00:30Z',httpStatus:200,response:{ready:false}},
 {date:'20261120',venue:1,race:12,requestedAt:'invalid',error:'timeout'}
]}]);
assert.deepEqual(timing.timingByDayAndHalf['20261120:early'],{timestampsPresent:2,missingTimestamps:0,earliest:'2026-11-20T00:00:01.000Z',latest:'2026-11-20T00:00:05.000Z'});
assert.deepEqual(timing.timingByDayAndHalf['20261120:late'],{timestampsPresent:1,missingTimestamps:1,earliest:'2026-11-20T00:00:30.000Z',latest:'2026-11-20T00:00:30.000Z'});
const windows=diagnoseArchiveReadiness([
 {date:'20261118',captureStart:'2026-11-18T08:42:55Z',records:[]},
 {date:'20261120',captureStart:'2026-11-19T23:42:35Z',records:[]},
 {date:'20261121',captureStart:'2026-11-20T23:09:00Z',records:[]},
 {date:'20261122',captureStart:'2026-11-21T23:00:00Z',records:[]}
]);
assert.equal(windows.captureWindowByDay['20261118'].jstClock,'17:42');
assert.equal(windows.captureWindowByDay['20261118'].scheduledMorningWindow,false);
assert.equal(windows.captureWindowByDay['20261120'].jstClock,'08:42');
assert.equal(windows.captureWindowByDay['20261120'].scheduledMorningWindow,false);
assert.equal(windows.captureWindowByDay['20261121'].scheduledMorningWindow,true);
assert.equal(windows.captureWindowByDay['20261122'].scheduledMorningWindow,true);

const failureDiagnostics=diagnoseArchiveReadiness([{date:'20261120',records:[
 {date:'20261120',venue:1,race:1,httpStatus:200,requestedAt:'2026-11-20T00:00:27.745Z',receivedAt:'2026-11-20T00:00:48.000Z',response:{ready:false,reason:'official_six_boat_stats_unverified',officialVerified:false,statsVerified:false,officialStatsRetry:'official_timeout',missingInputs:[]}},
 {date:'20261120',venue:1,race:7,httpStatus:200,requestedAt:'2026-11-20T00:01:44.267Z',receivedAt:'2026-11-20T00:01:44.500Z',response:{ready:false,reason:'official_six_boat_stats_unverified',officialVerified:false,statsVerified:false,officialStatsRetry:'official_http_403',missingInputs:[]}}
]}]);
assert.equal(failureDiagnostics.officialFailureByDayAndHalf['20261120:early:official_timeout'],1);
assert.equal(failureDiagnostics.officialFailureByDayAndHalf['20261120:late:official_http_403'],1);
assert.equal(failureDiagnostics.official403ByJstMinute['2026-11-20 09:01'],1);
assert.equal(failureDiagnostics.officialFailureTransitionByDay['20261120'].official_timeout_lastRequestedAt,'2026-11-20T00:00:27.745Z');
assert.equal(failureDiagnostics.officialFailureTransitionByDay['20261120'].official_http_403_firstRequestedAt,'2026-11-20T00:01:44.267Z');
assert.equal(failureDiagnostics.unverifiedVerificationFlagsByLatency['under_1s|officialVerified=false|statsVerified=false|officialStatsRetry=official_http_403|missingInputs=array:0'],1);
assert.equal(failureDiagnostics.unverifiedVerificationFlagsByLatency['from_15_to_30s|officialVerified=false|statsVerified=false|officialStatsRetry=official_timeout|missingInputs=array:0'],1);

console.log('PASS: archived readiness, retry classification, capture timing and JST morning-window checks');
