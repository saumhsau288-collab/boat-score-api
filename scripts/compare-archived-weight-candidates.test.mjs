import test from 'node:test';
import assert from 'node:assert/strict';
import {describeWeightCandidates,CANDIDATES} from './compare-archived-weight-candidates.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,finish:i+1,nationalWinRate:8-i,localWinRate:8-i,averageStartTiming:.12+i*.02}));
test('all five candidate scores describe six racers without choosing weights',()=>{
 const r=describeWeightCandidates({rows:[{status:'research_only_joined_postrace_archive',racers}]});
 assert.equal(r.races,1);assert.equal(r.candidates.length,CANDIDATES.length);
 assert.equal(r.candidates[0].topOne,1);assert.equal(r.selectedWeight,null);assert.equal(r.eligibleForWeightTuning,0);
});
test('invalid entry course and duplicate finish cannot contaminate score study',()=>{
 const r=describeWeightCandidates({rows:[{status:'research_only_joined_postrace_archive',racers:racers.map((x,i)=>({...x,entryCourse:i===5?1:x.entryCourse}))},{status:'research_only_joined_postrace_archive',racers:racers.map((x,i)=>({...x,finish:i===5?1:x.finish}))}]});
 assert.equal(r.races,0);
});
test('only explicit research joined status may be compared',()=>{
 const r=describeWeightCandidates({rows:[{status:'incomplete',racers}]});
 assert.equal(r.races,0);
});
