import test from 'node:test';
import assert from 'node:assert/strict';
import {compareHistoricalStartCourse} from './boat-score-2-start-course-historical-comparison.js';

const makeRace = () => ({
 date:'20261119',venue:1,race:1,preRaceSnapshot:true,resultVerified:true,
 finishOrder:[1,2,3,4,5,6],
 racers:Array.from({length:6},(_,i)=>({
  boat:i+1,predictedCourse:i+1,averageST:0.12+i*0.01,
  startTimingVerified:true,startTimingPreRace:true,
  nationalWinRate:7-i*0.3,localWinRate:6-i*0.2,
  motorTwoWinRate:40-i,recent50WinRate:30-i,exhibitionScore:80-i
 }))
});
test('compares two rankings without altering original race',()=>{
 const race=makeRace(),before=JSON.stringify(race);
 const result=compareHistoricalStartCourse([race]);
 assert.equal(result.status,'evaluated');
 assert.equal(result.eligible,1);
 assert.equal(result.baseline.winnerHits,1);
 assert.equal(result.candidate.winnerHits,1);
 assert.equal(JSON.stringify(race),before);
});
test('excludes unverified pre-race ST',()=>{
 const race=makeRace();race.racers[0].startTimingPreRace=false;
 const result=compareHistoricalStartCourse([race]);
 assert.equal(result.eligible,0);
 assert.equal(result.excluded,1);
});
test('excludes invalid or post-race snapshots',()=>{
 const race=makeRace();race.preRaceSnapshot=false;
 assert.equal(compareHistoricalStartCourse([race]).excluded,1);
});
test('rejects invalid weights and duplicate entry courses',()=>{
 assert.equal(compareHistoricalStartCourse([],{stPoints:-1}).status,'invalid_input');
 const race=makeRace();race.racers[0].predictedCourse=2;
 assert.equal(compareHistoricalStartCourse([race]).eligible,0);
});
