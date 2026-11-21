import test from 'node:test';import assert from 'node:assert/strict';import {classifyTopTwoAbilityPlacement,auditAbilityPlacement} from './audit-ability-placement.mjs';
const racers=(a,b)=>Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i+1===a?8:i+1===b?7:4}));
test('distinguishes inner pair, outer pair and split',()=>{
 assert.equal(classifyTopTwoAbilityPlacement(racers(1,2)).placement,'innerPair');
 assert.equal(classifyTopTwoAbilityPlacement(racers(4,5)).placement,'outerPair');
 assert.equal(classifyTopTwoAbilityPlacement(racers(1,5)).placement,'splitInnerOuter');
 assert.equal(classifyTopTwoAbilityPlacement(racers(2,6)).adjacent,false);
});
test('requires verified point-in-time snapshots before relating ability to outcomes',()=>{
 const row={date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,5,2,3,4,6],racers:racers(1,5)};
 assert.equal(auditAbilityPlacement([row]).eligible,0);
 assert.equal(auditAbilityPlacement([{...row,asOfVerified:true,capturedBeforeStart:true}]).groups.splitInnerOuter.topTwoBothPodium,1);
});
