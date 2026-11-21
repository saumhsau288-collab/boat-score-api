import test from 'node:test';import assert from 'node:assert/strict';import {auditBoatTwoVsThreeWhenOneTop} from './audit-boat-two-vs-three-when-one-top.mjs';
test('stratifies by pre-result rate comparison, not actual second place',()=>{
 const mk=(rates,finishOrder)=>({resultVerified:true,finishOrder,racers:rates.map((nationalWinRate,i)=>({boat:i+1,nationalWinRate}))});
 const days=['20261118','20261119','20261120'].map(date=>({date,reports:[{records:[mk([9,8,7,6,5,4],[1,3,2,4,5,6]),mk([9,7,8,6,5,4],[1,2,3,4,5,6])]}]}));
 const r=auditBoatTwoVsThreeWhenOneTop(days);
 assert.equal(r.buckets.twoStronger.threeSecond,3);assert.equal(r.buckets.threeStronger.twoSecond,3);
});
