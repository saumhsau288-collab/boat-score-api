import test from 'node:test';
import assert from 'node:assert/strict';
import {compareStartAndCourse} from './boat-score-2-start-course-comparison.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,predictedCourse:6-i,
 averageST:0.12+i*0.01,startTimingVerified:true,startTimingPreRace:true}));
test('preserves course distinct from boat and pre-race ST',()=>{
 const r=compareStartAndCourse(racers);
 assert.equal(r.status,'verified');
 assert.equal(r.racers[0].course,6);
 assert.equal(r.racers[0].insideCourse,false);
 assert.equal(r.racers[5].insideCourse,true);
 assert.equal(r.scoreChangeApplied,false);
});
test('rejects post-race ST and unavailable timings',()=>{
 const r=compareStartAndCourse(racers.map((x,i)=>i===0?{...x,startTimingPreRace:false}:x));
 assert.equal(r.status,'partial_or_unverified');
 assert.equal(r.racers[0].averageST,null);
});
test('rejects duplicate predicted courses',()=>{
 const wrong=racers.map(x=>({...x}));wrong[0].predictedCourse=wrong[1].predictedCourse;
 assert.equal(compareStartAndCourse(wrong).status,'invalid_race');
});
