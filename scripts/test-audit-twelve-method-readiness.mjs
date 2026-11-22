import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTwelveMethodReadiness} from './audit-twelve-method-readiness.mjs';
const full={date:'20261122',venue:2,race:1,racers:Array.from({length:6},(_,i)=>({
 boat:i+1,entryCourse:i+1,nationalWinRate:7-i*.5,localWinRate:0,
 averageStartTiming:.13+i*.01,motorTwoRate:30+i*5,
 exhibitionTime:6.8-i*.03,last50CoursePodiumRate:20+i*10
}))};
test('reports complete method coverage with six-racer inputs',()=>{
 const r=auditTwelveMethodReadiness([full]);
 assert.equal(r.validSnapshots,1);
 assert.equal(r.rows[0].ready.length,12);
 assert.equal(r.methods['favorite-1'].ready,1);
});
test('missing last50 causes method-specific abstention only',()=>{
 const partial={...full,racers:full.racers.map(({last50CoursePodiumRate,...r})=>r)};
 const r=auditTwelveMethodReadiness([partial]);
 assert.equal(r.methods['favorite-6'].abstained,1);
 assert.equal(r.methods['favorite-6'].reasons.missing_last50_or_ability,1);
 assert.equal(r.methods['favorite-1'].ready,1);
});
test('invalid course snapshot excluded from valid denominator',()=>{
 const bad={...full,racers:full.racers.map((r,i)=>({...r,entryCourse:i===5?1:r.entryCourse}))};
 const r=auditTwelveMethodReadiness([bad]);
 assert.equal(r.validSnapshots,0);assert.equal(r.invalidSnapshots,1);
 assert.equal(r.methods['favorite-1'].ready,0);
 assert.equal(r.rows[0].blockedMethods.length,12);
 assert.equal(r.rows[0].blockedReason,'invalid_six_racer_entry_course_snapshot');
});
