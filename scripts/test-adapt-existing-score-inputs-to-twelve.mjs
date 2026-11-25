import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptExistingScoreInputsToTwelve} from './adapt-existing-score-inputs-to-twelve.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:7-i*.5,
 localWinRate:0,averageStartTiming:.13+i*.01,motorTwoWinRate:30+i*5,
 recent50WinRate:40+i*3,exhibitionScore:50+i}));
test('maps motorTwoWinRate but refuses invented entry, exhibition and last50 data',()=>{
 const out=adaptExistingScoreInputsToTwelve({racers});
 assert.equal(out.mappedMotorField,6);
 assert.equal(out.snapshot.racers[0].motorTwoRate,30);
 assert.equal(out.snapshot.racers[0].entryCourse,null);
 assert.equal(out.snapshot.racers[0].last50CoursePodiumRate,null);
 assert.equal(out.snapshot.racers[0].exhibitionTime,null);
 assert.ok(out.readiness.invalid);
});
test('complete explicit entry courses allow ability and motor methods but not unrelated metrics',()=>{
 const out=adaptExistingScoreInputsToTwelve({racers:racers.map((r,i)=>({...r,entryCourse:i+1}))});
 assert.ok(out.readiness.ready.includes('favorite-1'));
 assert.ok(out.readiness.ready.includes('favorite-4'));
 assert.ok(out.readiness.abstained.some(x=>x.id==='favorite-5'));
 assert.ok(out.readiness.abstained.some(x=>x.id==='favorite-6'));
});
