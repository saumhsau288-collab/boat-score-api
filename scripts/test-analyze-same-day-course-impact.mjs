import assert from 'node:assert/strict';
import {analyzeSameDayCourseImpact} from './analyze-same-day-course-impact.mjs';
const race=(n,winningCourse=4)=>({date:'20261121',venue:'18',race:n,verified:true,
 runners:Array.from({length:6},(_,i)=>({entryCourse:i+1,finish:i+1===winningCourse?1:i+1<winningCourse?i+2:i+1,verified:true}))});
const result=analyzeSameDayCourseImpact([race(1),race(2),race(3),race(4),race(5)],{date:'20261121',venue:'18',race:5});
assert.equal(result.acceptedRaces,4);
assert.equal(result.rates[3].wins,4);
assert.equal(result.weatherImpactConfirmed,false);
assert.deepEqual(result.extraSixPicks,[]);
const early=analyzeSameDayCourseImpact([race(1),race(2)],{date:'20261121',venue:'18',race:3});
assert.equal(early.extraSixStatus,'insufficient_evidence');
console.log('Same-day entry-course evidence gate tests passed');
