import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptVerifiedOfficialMetricsToTwelve} from './adapt-verified-official-metrics-to-twelve.mjs';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'Racer '+(i+1),
 sourceVerified:true,nationalWinRate:7-i*.5,localWinRate:0,motorTwoWinRate:30+i*5}));
test('verified official six-racer inputs map to new research fields',()=>{
 const out=adaptVerifiedOfficialMetricsToTwelve({official});
 assert.equal(out.status,'mapped');assert.equal(out.racers.length,6);
 assert.equal(out.racers[0].motorTwoRate,30);
 assert.equal(out.racers[0].entryCourse,null);
 assert.equal(out.methodReadiness.ready.length,0);
});
test('verified supplemental entry course and ST enable only eligible methods',()=>{
 const extras=official.map((r,i)=>({racerId:r.racerId,sourceVerified:true,entryCourse:i+1,averageStartTiming:.13+i*.01}));
 const out=adaptVerifiedOfficialMetricsToTwelve({official,extras});
 assert.ok(out.methodReadiness.ready.includes('favorite-1'));
 assert.ok(out.methodReadiness.ready.includes('favorite-2'));
 assert.ok(out.methodReadiness.ready.includes('favorite-4'));
 assert.ok(out.methodReadiness.abstained.some(x=>x.id==='favorite-5'));
});
test('unverified extras cannot silently become predictors',()=>{
 const extras=official.map((r,i)=>({racerId:r.racerId,entryCourse:i+1,averageStartTiming:.13+i*.01}));
 const out=adaptVerifiedOfficialMetricsToTwelve({official,extras});
 assert.equal(out.racers[0].entryCourse,null);
 assert.equal(out.methodReadiness.ready.length,0);
});
test('unverified official metrics rejected',()=>{
 const bad=official.map((r,i)=>i===0?{...r,sourceVerified:false}:r);
 assert.equal(adaptVerifiedOfficialMetricsToTwelve({official:bad}).status,'insufficient_data');
});
