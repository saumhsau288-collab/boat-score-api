import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCourseEvidence} from './boat-score-2-course-evidence-comparison.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),predictedCourse:i+1,
 nationalWinRate:6,localWinRate:0,motorTwoWinRate:40,recent50WinRate:20,exhibitionScore:60}));
const matrix=Array.from({length:6},(_,i)=>({course:i+1,finishes:[1,1,0,0,0,0]}));
const evidence=Object.fromEntries(racers.map(r=>[r.racerId,{verified:true,courseAxisVerified:true,
 finishAxisVerified:true,sampleSizeVerified:true,racerId:r.racerId,course:r.predictedCourse,matrix,sampleSize:12}]));
test('six verified courses show separate evidence without modifying base score',()=>{
 const result=compareCourseEvidence(racers,evidence);
 assert.equal(result.status,'six_courses_verified');
 assert.equal(result.verifiedCourseCount,6);
 assert.equal(result.scoreChangeApplied,false);
 assert.equal(result.racers[0].courseEvidence.firstRate,0.5);
 assert.equal(result.racers[0].baseScore,result.racers[1].baseScore);
});
test('missing evidence is explicit, not silently treated as zero',()=>{
 const result=compareCourseEvidence(racers,{});
 assert.equal(result.status,'partial_or_unverified');
 assert.equal(result.verifiedCourseCount,0);
 assert.equal(result.racers[0].courseEvidence.verified,false);
});
test('rejects duplicate boat identifiers',()=>{
 assert.equal(compareCourseEvidence([racers[0],racers[0],...racers.slice(2)],evidence).status,'invalid_race');
});
