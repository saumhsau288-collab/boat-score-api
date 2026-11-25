import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAdjacentAgainstChance} from './audit-adjacent-baseline.mjs';
const row=(race,finishOrder)=>({date:'20261120',venue:1,race,resultVerified:true,finishOrder});
test('edge and middle winners have different opportunity baselines',()=>{
 const r=auditAdjacentAgainstChance([row(1,[1,2,3,4,5,6]),row(2,[5,6,2,1,3,4]),row(3,[3,2,4,1,5,6])]);
 assert.equal(r.byWinningBoat['1'].expectedSecondRate,0.2);
 assert.ok(Math.abs(r.byWinningBoat['1'].expectedPodiumRate-0.4)<1e-12);
 assert.equal(r.byWinningBoat['3'].expectedSecondRate,0.4);
 assert.ok(Math.abs(r.byWinningBoat['3'].expectedPodiumRate-0.7)<1e-12);
 assert.equal(r.byWinningBoat['5'].neighborPodium,1);
 assert.equal(r.eligible,3);
});
