import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAdjacentPodium} from './audit-adjacent-podium.mjs';
const row=(race,finishOrder)=>({date:'20261120',venue:1,race,resultVerified:true,finishOrder});
test('counts adjacent finishers separately by winning boat',()=>{
 const report=auditAdjacentPodium([row(1,[5,6,2,1,3,4]),row(2,[1,3,2,4,5,6])]);
 assert.equal(report.eligible,2);
 assert.equal(report.byWinningBoat['5'].neighborSecond,1);
 assert.equal(report.byWinningBoat['5'].neighborPodium,1);
 assert.equal(report.byWinningBoat['1'].neighborThird,1);
 assert.equal(report.byWinningBoat['1'].neighborPodiumRate,1);
 assert.equal(report.byWinningBoat['4'].neighborPodiumRate,null);
});
test('excludes unverified races and rejects duplicates',()=>{
 assert.equal(auditAdjacentPodium([{...row(1,[1,2,3,4,5,6]),resultVerified:false}]).excluded,1);
 assert.throws(()=>auditAdjacentPodium([row(1,[1,2,3,4,5,6]),row(1,[1,2,3,4,5,6])]),/duplicate/);
});
