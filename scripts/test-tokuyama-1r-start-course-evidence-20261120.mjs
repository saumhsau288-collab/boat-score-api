import assert from 'node:assert/strict';
import {compareStartAndCourse} from '../boat-score-2-start-course-comparison.js';

// 2026-11-20 Tokuyama 1R: retrospective research-only ST/course audit.
// Source: https://kyotei-karte.com/race/2026-11-20/tokuyama/1/
// Archived values are NOT authenticated pre-deadline snapshots.
// Do not pass actual race ST (0.15,0.14,0.13,0.15,0.14,0.12) as features.
// The fifth racer has displayed average ST 0.00: treat as missing sample.
const data=[
 {boat:1,racerId:'4551',averageST:.17,course:1},
 {boat:2,racerId:'4966',averageST:.16,course:2},
 {boat:3,racerId:'5090',averageST:.15,course:3},
 {boat:4,racerId:'4945',averageST:.18,course:4},
 {boat:5,racerId:'5459',averageST:null,course:5},
 {boat:6,racerId:'5000',averageST:.12,course:6}
];
const racers=data.map(r=>({boat:r.boat,racerId:r.racerId,predictedCourse:r.course,
 averageST:r.averageST,startTimingVerified:false,startTimingPreRace:false}));
const audit=compareStartAndCourse(racers);
assert.equal(audit.status,'partial_or_unverified');
assert.equal(audit.scoreChangeApplied,false);
assert.equal(audit.racers.filter(r=>r.startVerified).length,0);
assert.equal(audit.racers[4].averageST,null);
// The actual observed entry was 1-2-3-4-5-6. This alone does not prove
// the course was independently verified before the race deadline.
assert.deepEqual(audit.racers.map(r=>r.course),[1,2,3,4,5,6]);
// Isolate the five nonzero displayed average ST values as descriptive only.
const descriptive=data.filter(r=>r.averageST!==null)
 .sort((a,b)=>a.averageST-b.averageST||a.boat-b.boat)
 .map(r=>r.boat);
assert.deepEqual(descriptive,[6,3,2,1,4]);
console.log(JSON.stringify({status:'retrospective_descriptive_only',race:'20261120-18-1',
 averageSTOrderExcludingUnknown:descriptive,actualCourseOrder:[1,2,3,4,5,6],
 verifiedPreRaceSTCount:0,scoreChangeApplied:false},null,2));
