import test from 'node:test';import assert from 'node:assert/strict';import {rankNationalLocalAverage,auditBoatOneNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
const racers=[{boat:1,nationalWinRate:8,localWinRate:0},{boat:2,nationalWinRate:7,localWinRate:9},...Array.from({length:4},(_,i)=>({boat:i+3,nationalWinRate:5,localWinRate:5}))];
test('averages rather than sums and falls back from local zero',()=>{const r=rankNationalLocalAverage(racers);assert.equal(r[0].score,8);assert.equal(r[0].boat,1);assert.equal(r[0].localFallback,true);assert.equal(r[1].score,8);});
test('excludes tied highest score and reports fallback',()=>{const x=auditBoatOneNationalLocalAverage([{racers,resultVerified:true,finishOrder:[1,2,3,4,5,6]}]);assert.equal(x.counts.tiedTop,1);assert.equal(x.counts.boatOneTop,0);assert.equal(x.counts.missingLocalAny,1);});

test('separates complete local-rate cases from national fallback',()=>{
 const complete=racers.map((x,i)=>({...x,localWinRate:i===0?10:5}));
 const outcome={resultVerified:true,finishOrder:[1,3,2,4,5,6]};
 const x=auditBoatOneNationalLocalAverage([{...outcome,racers:complete},{...outcome,racers:racers.map((x,i)=>({...x,localWinRate:i===0?0:5}))}]);
 assert.equal(x.groups.allLocalObserved.races,1);
 assert.equal(x.groups.localFallback.races,1);
 assert.equal(x.groups.allLocalObserved.secondWhenOneWins[3],1);
});
