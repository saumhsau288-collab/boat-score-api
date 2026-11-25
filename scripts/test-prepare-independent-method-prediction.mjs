import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareIndependentMethodPrediction} from './prepare-independent-method-prediction.mjs';
import {evaluateTwelveIndependentMethods} from './evaluate-twelve-independent-methods.mjs';
const snapshot={
 date:'20261122',venue:2,race:3,
 preRaceSnapshot:{capturedAt:'2026-11-22T10:00:00+09:00',scheduledStartAt:'2026-11-22T10:10:00+09:00'},
 racers:Array.from({length:6},(_,i)=>({
  boat:i+1,entryCourse:i+1,nationalWinRate:7-i*.5,localWinRate:0,
  averageStartTiming:.13+i*.01,motorTwoRate:30+i*5,
  exhibitionTime:6.8-i*.03,last50CoursePodiumRate:20+i*10
 }))
};
const timing={predictedAt:'2026-11-22T10:02:00+09:00',writtenAt:'2026-11-22T10:03:00+09:00'};
test('bridges twelve predictions but refuses to authenticate them',()=>{
 const p=prepareIndependentMethodPrediction(snapshot,timing);
 assert.equal(Object.keys(p.methods).length,12);
 assert.equal(p.methods['favorite-1'].trifecta[0],1);
 assert.equal(p.preRaceVerified,false);
 assert.equal(p.ruleVersionsFrozen,false);
 assert.equal(p.savedBeforeStart,false);
 const out=evaluateTwelveIndependentMethods([p],[{date:p.date,venue:p.venue,race:p.race,resultVerified:true,finishOrder:[1,2,3,4,5,6]}]);
 assert.equal(out.totals.excluded,1);
});
test('missing last50 explicitly abstains, not a fallback pick',()=>{
 const s={...snapshot,racers:snapshot.racers.map(({last50CoursePodiumRate,...r})=>r)};
 const p=prepareIndependentMethodPrediction(s,timing);
 assert.equal(p.methods['favorite-6'].abstained,true);
 assert.equal(p.methods['favorite-6'].trifecta,undefined);
});
test('rejects after-cutoff write and missing entry course',()=>{
 assert.throws(()=>prepareIndependentMethodPrediction(snapshot,{...timing,writtenAt:'2026-11-22T10:11:00+09:00'}));
 assert.throws(()=>prepareIndependentMethodPrediction({...snapshot,racers:snapshot.racers.map(({entryCourse,...r})=>r)},timing));
});
