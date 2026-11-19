import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePreRaceEvidence} from './boat-score-2-pre-race-evidence.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),predictedCourse:6-i,
 nationalWinRate:6,localWinRate:0,motorTwoWinRate:40,recent50WinRate:20,exhibitionScore:60,
 averageST:0.13,startTimingVerified:true,startTimingPreRace:true}));
const matrix=Array.from({length:6},(_,i)=>({course:i+1,finishes:[1,1,0,0,0,0]}));
const evidence=Object.fromEntries(racers.map(r=>[r.racerId,{verified:true,courseAxisVerified:true,
 finishAxisVerified:true,sampleSizeVerified:true,racerId:r.racerId,course:r.predictedCourse,matrix,sampleSize:12}]));
test('combines verified pre-race evidence without score changes',()=>{
 const result=comparePreRaceEvidence(racers,evidence);
 assert.equal(result.status,'evidence_complete');
 assert.equal(result.verifiedCourseCount,6);
 assert.equal(result.verifiedStartCount,6);
 assert.equal(result.baseScoresAvailable,6);
 assert.equal(result.racers[0].start.course,6);
 assert.equal(result.scoreChangeApplied,false);
});
test('missing course evidence is visible',()=>{
 const result=comparePreRaceEvidence(racers,{});
 assert.equal(result.status,'evidence_incomplete');
 assert.equal(result.verifiedCourseCount,0);
});
test('post-race start data cannot count as verified',()=>{
 const changed=racers.map((r,i)=>i===0?{...r,startTimingPreRace:false}:r);
 const result=comparePreRaceEvidence(changed,evidence);
 assert.equal(result.status,'evidence_incomplete');
 assert.equal(result.verifiedStartCount,5);
});
