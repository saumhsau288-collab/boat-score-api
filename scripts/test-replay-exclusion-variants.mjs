import assert from 'node:assert/strict';
import {replayExclusionVariants} from './replay-exclusion-variants.mjs';
const base={date:'20261122',venue:1,race:1,capturedAt:'2026-11-22T04:00:00Z',deadlineAt:'2026-11-22T06:00:00Z',resultVerified:true,incidentFree:true,
 officialFinish:[2,1,3,4,5,6],boats:[1,2,3,4,5,6].map((boat)=>({boat,score:7-boat,top2Rate:80-boat*10,entryCourse:boat}))};
const result=replayExclusionVariants([base]);
assert.equal(result.held.length,0);
assert.equal(result.summary.exclude_lowest_1.eligible,1);
assert.equal(result.summary.exclude_lowest_2.excludedTopTwoCorrect,1);
assert.equal(result.summary.exclude_lowest_3.excludedTopTwoCorrect,1);
assert.equal(result.detail[0].cases.exclude_lowest_2.excluded.length,2);
assert.equal(result.detail[0].cases.exclude_lowest_2.picks.length,6);
assert.equal(result.summary.baseline_no_exclusion.firstCorrect,0);
assert.equal(replayExclusionVariants([{...base,capturedAt:'2026-11-22T07:00:00Z'}]).held.length,1);
assert.equal(replayExclusionVariants([{...base,boats:base.boats.map(({top2Rate,...x})=>x)}]).summary.exclude_weak_top2_1.eligible,0);
assert.equal(replayExclusionVariants([{...base,boats:base.boats.map(({entryCourse,...x})=>x)}]).summary.exclude_score_course_1.eligible,0);
assert.equal(replayExclusionVariants([{...base,boats:base.boats.map(x=>({...x,entryCourse:1}))}]).summary.exclude_score_course_2.eligible,0);
assert.throws(()=>replayExclusionVariants([base,base]),/Duplicate/);
console.log('Historical exclusion replay: eight variants, six picks, no post-deadline evidence, missing metric hold, duplicate guards passed.');
