import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreWinnerCandidates} from './candidate-winner-score.mjs';
const racers=rates=>rates.map((nationalWinRate,i)=>({boat:i+1,nationalWinRate}));
test('inner advantage can break a near tie but does not overpower a large ability gap',()=>{
 const near=scoreWinnerCandidates(racers([7,7.1,5,4,3,2]));
 assert.equal(near[0].boat,1);
 const clear=scoreWinnerCandidates(racers([7,9,5,4,3,2]));
 assert.equal(clear[0].boat,2);
});
test('rejects incomplete and duplicate pre-race inputs',()=>{
 assert.throws(()=>scoreWinnerCandidates(racers([7,6])),/six/);
 const dup=racers([7,6,5,4,3,2]);dup[1].boat=1;
 assert.throws(()=>scoreWinnerCandidates(dup),/invalid boat/);
});
test('winner score is unaffected by any result-like properties',()=>{
 const r=racers([7,7.1,5,4,3,2]);
 assert.deepEqual(scoreWinnerCandidates(r),scoreWinnerCandidates(r.map(x=>({...x,finishOrder:[6,5,4,3,2,1],resultVerified:true}))));
});
