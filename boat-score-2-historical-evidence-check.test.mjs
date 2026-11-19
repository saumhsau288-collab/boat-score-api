import test from 'node:test';
import assert from 'node:assert/strict';
import {compareHistoricalRace,summarizeHistoricalComparisons} from './boat-score-2-historical-evidence-check.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),predictedCourse:i+1,
 nationalWinRate:8-i,localWinRate:0,motorTwoWinRate:40,recent50WinRate:20,exhibitionScore:60,
 averageST:0.15,startTimingVerified:true,startTimingPreRace:true}));
const snapshot={preRaceSnapshot:true,resultVerified:true,racers,finishOrder:[1,2,3,4,5,6],evidenceByRacerId:{}};
test('checks historical finish without using it to modify the score',()=>{
 const r=compareHistoricalRace(snapshot);
 assert.equal(r.status,'evaluated');
 assert.deepEqual(r.predicted,[1,2,3,4,5,6]);
 assert.equal(r.winnerHit,true);
 assert.equal(r.topThreeSetHit,true);
 assert.equal(r.exactTopThreeHit,true);
 assert.equal(r.scoreChangeApplied,false);
 assert.equal(r.evidenceStatus,'evidence_incomplete');
});
test('rejects post-race or unverified snapshots',()=>{
 assert.equal(compareHistoricalRace({...snapshot,preRaceSnapshot:false}).status,'unverified_result');
 assert.equal(compareHistoricalRace({...snapshot,resultVerified:false}).status,'unverified_result');
 assert.equal(compareHistoricalRace({...snapshot,finishOrder:[1,1,3,4,5,6]}).status,'unverified_result');
});
test('reports exclusions rather than inventing accuracy',()=>{
 const r=summarizeHistoricalComparisons([snapshot,{...snapshot,resultVerified:false}]);
 assert.equal(r.eligible,1);
 assert.equal(r.excluded,1);
 assert.equal(r.winnerRate,1);
 assert.equal(summarizeHistoricalComparisons([]).winnerRate,null);
});
