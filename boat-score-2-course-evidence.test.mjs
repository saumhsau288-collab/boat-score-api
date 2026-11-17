import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCourseEvidence,evaluateAbilityAndCourse} from './boat-score-2-course-evidence.js';
const base={boat:4,racerId:'4598',entryCourse:4,entryCourseVerified:true,courseHistoryVerified:true,courseHistoryRacerId:'4598',courseHistoryCourse:4,courseFirstRate:20,courseSecondRate:15,courseThirdRate:25,courseSampleSize:40};
test('course statistics are evaluated separately from individual ability',()=>{
 const v=evaluateAbilityAndCourse(base,()=>({status:'evaluated',score:71}));
 assert.equal(v.ability.score,71);
 assert.equal(v.course.firstRate,20);
 assert.equal(v.course.podiumRate,60);
 assert.equal(v.combinedScore,null);
});
test('boat number alone never establishes entry course',()=>{
 assert.equal(evaluateCourseEvidence({...base,entryCourseVerified:false}).status,'missing_verified_entry_course');
});
test('reject another racer course data or wrong entry course',()=>{
 assert.equal(evaluateCourseEvidence({...base,courseHistoryRacerId:'9999'}).status,'course_history_identity_unverified');
 assert.equal(evaluateCourseEvidence({...base,courseHistoryCourse:3}).status,'course_history_identity_unverified');
});
test('do not fabricate course data from national win rate',()=>{
 assert.equal(evaluateCourseEvidence({boat:4,racerId:'4598',entryCourse:4,entryCourseVerified:true,nationalWinRate:7.2}).status,'missing_course_specific_history');
});
test('reject rates summing above 100',()=>{
 assert.equal(evaluateCourseEvidence({...base,courseThirdRate:80}).status,'invalid_course_rates');
});
