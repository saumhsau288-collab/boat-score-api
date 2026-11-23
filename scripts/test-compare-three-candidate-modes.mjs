import assert from 'node:assert/strict';
import {compareThreeCandidateModes} from './compare-three-candidate-modes.mjs';
const cases=[
 ['inside',[9,8,7,6,5,4],[.12,.13,.14,.15,.16,.17]],
 ['outside',[4,5,6,7,8,9],[.17,.16,.15,.14,.13,.12]],
 ['equal',[7,7,7,7,7,7],[.11,.12,.13,.14,.15,.16]],
 ['mixed',[7,9,5,8,6,7.5],[.16,.14,.10,.18,.11,.13]],
 ['tied_top',[9,9,7,6,5,4],[.12,.13,.14,.15,.16,.17]]
];
const rows=cases.map(([scenario,scores,starts])=>{
 const racers=scores.map((score,i)=>({boat:i+1,score,avgStart:starts[i]}));
 const out=compareThreeCandidateModes(racers);
 assert.equal(out.rows.length,12);
 assert.equal(out.rankRelativeFallback,out.topAbilityBoats.length===6);

 assert.deepEqual(compareThreeCandidateModes([...racers].reverse()),out);
 for(const mode of ['legacy','unrestricted','rank_relative']){
  assert.equal(out.summary[mode].distinctTickets,12);
  assert.equal(Object.values(out.summary[mode].firstCounts).reduce((a,b)=>a+b,0),12);
 }
 assert.equal(out.summary.rank_relative.upsetFirstOnStrongInside,0);
 assert.equal(out.summary.legacy.changedTicketsFromLegacy,0);
 return {scenario,topAbilityBoats:out.topAbilityBoats,rankRelativeFallback:out.rankRelativeFallback,summary:out.summary};
});
console.log('THREE_CANDIDATE_MODE_MATRIX '+JSON.stringify(rows,null,2));
console.log('PASS: three-way candidate policy comparison');
