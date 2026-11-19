import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRacerWithCourseEvidence} from './boat-score-2-course-evidence-bridge.js';
const racer={racerId:'4001',predictedCourse:4,nationalWinRate:7,localWinRate:0,motorTwoWinRate:40,recent50WinRate:30,exhibitionScore:70};
const matrix=Array.from({length:6},(_,i)=>({course:i+1,finishes:i===3?[3,2,1,0,0,0]:[0,0,0,0,0,0]}));
test('keeps base scoring unchanged and reports verified course evidence separately',()=>{
 const x=evaluateRacerWithCourseEvidence(racer,{verified:true,courseAxisVerified:true,finishAxisVerified:true,sampleSizeVerified:true,racerId:'4001',course:4,matrix,sampleSize:6});
 assert.equal(x.base.status,'evaluated');
 assert.equal(x.courseEvidence.verified,true);
 assert.equal(x.courseEvidence.firstRate,0.5);
 assert.equal(x.combinedScore,null);
});
test('rejects wrong racer identity and mismatched predicted course',()=>{
 assert.equal(evaluateRacerWithCourseEvidence(racer,{verified:true,courseAxisVerified:true,finishAxisVerified:true,sampleSizeVerified:true,racerId:'9999',course:4,matrix,sampleSize:6}).courseEvidence.verified,false);
 assert.equal(evaluateRacerWithCourseEvidence(racer,{verified:true,courseAxisVerified:true,finishAxisVerified:true,sampleSizeVerified:true,racerId:'4001',course:1,matrix,sampleSize:6}).courseEvidence.verified,false);
});
test('does not accept unsupported 50-race sample',()=>{
 assert.equal(evaluateRacerWithCourseEvidence(racer,{verified:true,courseAxisVerified:true,finishAxisVerified:true,sampleSizeVerified:true,racerId:'4001',course:4,matrix,sampleSize:50}).courseEvidence.reason,'sample_size_not_verified');
});

test('rejects unverified axis mapping even when a caller sets verified true',()=>{
 const x=evaluateRacerWithCourseEvidence(racer,{verified:true,racerId:'4001',course:4,matrix,sampleSize:6});
 assert.equal(x.courseEvidence.verified,false);
 assert.equal(x.combinedScore,null);
});
