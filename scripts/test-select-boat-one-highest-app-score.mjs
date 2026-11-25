import test from 'node:test';import assert from 'node:assert/strict';import {selectBoatOneHighestAppScore} from './select-boat-one-highest-app-score.mjs';
const r=scores=>({racers:scores.map((evaluationScore,i)=>({boat:i+1,evaluationScore,nationalWinRate:i===0?9:1}))});
test('requires app score, never substitutes national win rate',()=>{
 const x=selectBoatOneHighestAppScore([r([10,9,8,7,6,5]),r([null,null,null,null,null,null]),r([8,10,7,6,5,4]),r([10,10,8,7,6,5])]);
 assert.equal(x.counts.selected,1);assert.equal(x.counts.missingScore,1);assert.equal(x.counts.notHighest,1);assert.equal(x.counts.tiedHighest,1);
});
