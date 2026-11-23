import assert from 'node:assert/strict';
import {rankSixAbilityCourseStart} from './rank-six-ability-course-start.mjs';
const base=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,nationalWinRate:5+i*0.5,
 localWinRate:5+i*0.5,motorTwoWinRate:40,recent50WinRate:40,exhibitionScore:50,startTiming:0.20-i*0.02}));
const result=rankSixAbilityCourseStart(base);
assert.equal(result.status,'research_only');
assert.deepEqual(result.signals.ability,[6,5,4,3,2,1]);
assert.deepEqual(result.signals.start,[6,5,4,3,2,1]);
assert.deepEqual(result.signals.course,[1,2,3,4,5,6]);
assert.deepEqual(result.podiumCandidates.course,[1,2,3]);
assert.equal(result.rows.length,6);
assert.equal(result.scoreAdjustment,0);
const swapped=base.map(r=>r.boat===1?{...r,course:6}:r.boat===6?{...r,course:1}:r);
assert.equal(rankSixAbilityCourseStart(swapped).signals.course[0],6);
assert.equal(rankSixAbilityCourseStart(base.map(r=>r.boat===1?{...r,startTiming:null}:r)).status,'insufficient_course_start_data');
assert.equal(rankSixAbilityCourseStart(base.map(r=>r.boat===1?{...r,nationalWinRate:null}:r)).status,'insufficient_ability_data');
console.log('All-six independent signal rankings fixture passed');
