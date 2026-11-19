import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeVenueTendencies} from './boat-score-2-venue-tendencies.js';
const race=(venue,winnerCourse)=>({venue,racers:[1,2,3,4,5,6].map(entryCourse=>({entryCourse,finish:entryCourse===winnerCourse?1:entryCourse<winnerCourse?entryCourse+1:entryCourse}))});
test('counts inside and outside wins separately',()=>{
 const rows=[race(18,1),race(18,5),race(18,5)];const result=summarizeVenueTendencies(rows,{minRaces:3});
 assert.equal(result[0].races,3);assert.equal(result[0].winsByCourse[0],1);assert.equal(result[0].winsByCourse[4],2);
 assert.equal(result[0].insideWinRate,1/3);assert.equal(result[0].outsideWinRate,2/3);
 assert.equal(result[0].eligibleForPredictionAdjustment,false);
});
