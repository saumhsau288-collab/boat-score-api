import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCourseFinishMatrix,scoreCourseFinishEvidence} from './boat-score-2-course-finish-matrix.js';
const matrix=Array.from({length:6},(_,i)=>({course:i+1,finishes:i===3?[3,2,1,0,0,0]:i===0?[2,1,1,0,0,0]:[0,0,0,0,0,0]}));
test('uses the actual course, not boat number or global first-column share',()=>{
 const x=scoreCourseFinishEvidence(matrix,4,10);
 assert.equal(x.verified,true);
 assert.equal(x.starts,6);
 assert.equal(x.firstRate,0.5);
 assert.equal(x.top3Rate,1);
});
test('rejects unproven sample size',()=>assert.equal(scoreCourseFinishEvidence(matrix,4,50).reason,'sample_size_not_verified'));
test('rejects missing course starts',()=>assert.equal(scoreCourseFinishEvidence(matrix,6,10).reason,'no_starts_in_course'));
test('rejects malformed matrix',()=>{
 assert.equal(validateCourseFinishMatrix(matrix.slice(1)).verified,false);
 const bad=matrix.map(r=>({...r}));
 bad[0].finishes=[-1,1,1,1,1,1];
 assert.equal(validateCourseFinishMatrix(bad).verified,false);
});
