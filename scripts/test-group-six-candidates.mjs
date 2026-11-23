import assert from 'node:assert/strict';
import {groupSixCandidates} from './group-six-candidates.mjs';
const base=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,nationalWinRate:5+i*.5,
 localWinRate:5+i*.5,motorTwoWinRate:40,recent50WinRate:40,exhibitionScore:50,startTiming:.20-i*.02}));
const groups=groupSixCandidates(base);
assert.equal(groups.status,'research_only');
assert.deepEqual(groups.favorites,[6,5,4]);
assert.deepEqual(groups.counterCandidates,[6]);
// Equal signal counts are ordered by ability score, then course and boat.
assert.deepEqual(groups.singleSignal,[1,3,2]);
assert.deepEqual(groups.unsupported,[]);
assert.equal(groups.insideCourseBoat,1);
assert.equal(groups.calibrated,false);
assert.equal(groupSixCandidates(base.map(r=>r.boat===1?{...r,startTiming:null}:r)).status,'insufficient_course_start_data');
console.log('Six candidate grouping fixture passed');
