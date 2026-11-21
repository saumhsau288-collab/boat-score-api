import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAdjacentByAbility} from './audit-adjacent-ability.mjs';
const row=(race,order,rates,extra={})=>({date:'20261120',venue:1,race,resultVerified:true,preRaceVerified:true,capturedBeforeStart:true,finishOrder:order,preRaceNationalWinRates:rates,...extra});
test('groups by verified pre-race ability and counts podium',()=>{
 const r=auditAdjacentByAbility([
  row(1,[5,6,2,1,3,4],[4,4,4,4,5,7]),
  row(2,[1,3,4,2,5,6],[4,4,4,4,5,7])
 ]);
 assert.equal(r.eligible,2);
 assert.equal(r.groups.high.races,1);
 assert.equal(r.groups.high.neighborPodium,1);
 assert.equal(r.groups.low.races,1);
 assert.equal(r.groups.low.neighborPodium,0);
});
test('rejects data without verified pre-race provenance',()=>{
 const r=auditAdjacentByAbility([row(1,[5,6,2,1,3,4],[4,4,4,4,5,7],{capturedBeforeStart:false})]);
 assert.equal(r.eligible,0);assert.equal(r.excluded,1);
});
test('rejects duplicate race keys',()=>{
 const r=row(1,[5,6,2,1,3,4],[4,4,4,4,5,7]);
 assert.throws(()=>auditAdjacentByAbility([r,r]),/duplicate race/);
});
