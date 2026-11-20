import assert from 'node:assert/strict';
import {analyzeSameDayCourseImpact} from './analyze-same-day-course-impact.mjs';
import {compareVenueCourseShift} from './compare-venue-course-shift.mjs';
const completed=Array.from({length:4},(_,i)=>({date:'20261121',venue:'18',race:i+1,verified:true,
 runners:Array.from({length:6},(_,j)=>({entryCourse:j+1,finish:j===3?1:j<3?j+2:j+1,verified:true}))}));
const diagnostic=analyzeSameDayCourseImpact(completed,{date:'20261121',venue:'18',race:5});
const baseline=Array.from({length:6},(_,i)=>({venue:'18',course:i+1,starts:100,wins:i===3?10:18,podiums:50,historyThroughDate:'20261120'}));
const comparison=compareVenueCourseShift(diagnostic,baseline);
assert.equal(comparison.comparisons[3].sameDayWinRate,1);
assert.equal(comparison.comparisons[3].historicalWinRate,0.1);
assert.deepEqual(comparison.flaggedCourses,[4]);
assert.deepEqual(comparison.extraSixPicks,[]);
assert.equal(comparison.weatherImpactConfirmed,false);
assert.throws(()=>compareVenueCourseShift(diagnostic,baseline.map(r=>({...r,historyThroughDate:'20261121'}))),/future_baseline/);
console.log('Venue historical course baseline comparison tests passed');
