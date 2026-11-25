import test from 'node:test';import assert from 'node:assert/strict';import {assessProspectiveAdmission} from './assess-prospective-admission.mjs';
const base={venue:2,date:'20261121',race:3,sourceUrl:'https://example.org/official',capturedAt:'2026-11-21T10:00:00+09:00',scheduledStartAt:'2026-11-21T10:10:00+09:00',racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,averageStartTiming:0.15}))};
const verified={verified:true,sourceUrl:base.sourceUrl,verifiedAt:'2026-11-21T10:01:00+09:00',method:'human-reviewed source and capture'};
test('does not admit structurally valid but unverified data',()=>{assert.equal(assessProspectiveAdmission(base).reason,'source_not_verified');assert.equal(assessProspectiveAdmission(base,{...verified,sourceUrl:'https://other.example'}).reason,'source_mismatch');});
test('requires review metadata and complete data',()=>{assert.equal(assessProspectiveAdmission(base,{...verified,method:''}).reason,'verification_method_missing');assert.equal(assessProspectiveAdmission({...base,racers:base.racers.map(({averageStartTiming,...r})=>r)},verified).reason,'incomplete_capture');assert.equal(assessProspectiveAdmission(base,verified).admitted,true);});

test('source verification must occur after capture and before race start',()=>{
 assert.equal(assessProspectiveAdmission(base,{...verified,verifiedAt:'2026-11-21T09:59:00+09:00'}).reason,'verification_before_capture');
 assert.equal(assessProspectiveAdmission(base,{...verified,verifiedAt:'2026-11-21T10:10:00+09:00'}).reason,'verification_after_start');
});
