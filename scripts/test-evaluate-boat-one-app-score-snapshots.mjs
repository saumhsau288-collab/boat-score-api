import test from 'node:test';import assert from 'node:assert/strict';import {evaluateBoatOneAppScoreSnapshots} from './evaluate-boat-one-app-score-snapshots.mjs';
const snap=(scores,sourceVerified=true)=>({date:'20261120',venue:1,race:1,sourceVerified,preRaceSnapshot:{source:'official',capturedAt:'2026-11-20T10:00:00+09:00',scheduledStartAt:'2026-11-20T10:15:00+09:00'},racers:scores.map((evaluationScore,i)=>({boat:i+1,evaluationScore}))});
const outcome={date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,3,2,4,5,6]};
test('only verified, timestamped, highest-score boat one is eligible',()=>{
 const x=evaluateBoatOneAppScoreSnapshots([snap([9,8,7,6,5,4])],[outcome]);
 assert.equal(x.counts.selected,1);assert.equal(x.counts.first,1);assert.equal(x.counts.exact123,0);
 const y=evaluateBoatOneAppScoreSnapshots([snap([9,8,7,6,5,4],false)],[outcome]);assert.equal(y.counts.selected,0);assert.equal(y.counts.sourceUnverified,1);
});
test('rejects missing app scores and does not use archived rates',()=>{
 const x=evaluateBoatOneAppScoreSnapshots([snap([null,null,null,null,null,null])],[outcome]);
 assert.equal(x.counts.missingScore,1);assert.equal(x.counts.selected,0);
});
