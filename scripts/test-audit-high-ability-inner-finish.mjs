import test from 'node:test';
import assert from 'node:assert/strict';
import {auditHighAbilityInnerFinish} from './audit-high-ability-inner-finish.mjs';
const race=(rates,order)=>({resultVerified:true,finishOrder:[...order,4,5,6].slice(0,6),racers:rates.map((nationalWinRate,i)=>({boat:i+1,nationalWinRate}))});
test('highest rate in boat 1 and boat 2 are disjoint and union is exact',()=>{
 const data=[{reports:[{records:[
  race([9,8,7,6,5,4],[1,2,3]),
  race([8,9,7,6,5,4],[2,1,3]),
  race([7,8,9,6,5,4],[3,1,2])
 ]}]}];
 const g=auditHighAbilityInnerFinish(data).groups;
 assert.equal(g.top1_in_1.races,1);
 assert.equal(g.top1_in_2.races,1);
 assert.equal(g.top1_in_1_or_2.races,2);
 assert.equal(g.top2_in_1_and_2.races,1);
 assert.equal(g.other.races,1);
 assert.equal(g.top1_in_2.first2,1);
 assert.equal(g.top2_in_2_and_1.races,1);
 assert.equal(g.top1_in_1.exact123,1);
});
test('ambiguous tied top two are excluded',()=>{
 const data=[{reports:[{records:[race([9,9,7,6,5,4],[1,2,3])]}]}];
 assert.equal(auditHighAbilityInnerFinish(data).excluded,1);
});

test('ability-gap buckets keep both directions distinct',()=>{
 const data=[{reports:[{records:[
  race([9,8.5,7,6,5,4],[1,2,3]),
  race([8,9.5,7,6,5,4],[2,1,3]),
  race([9,7.5,7,6,5,4],[1,3,2]),
  race([7,9.5,6,5,4,3],[2,1,3])
 ]}]}];
 const b=auditHighAbilityInnerFinish(data).abilityGap;
 assert.equal(b.boat1_stronger.lt1.races,1);
 assert.equal(b.boat1_stronger['1to2'].races,1);
 assert.equal(b.boat2_stronger['1to2'].races,1);
 assert.equal(b.boat2_stronger.gte2.races,1);
 assert.equal(b.boat1_stronger.lt1.first1,1);
 assert.equal(b.boat2_stronger.gte2.first2,1);
});
