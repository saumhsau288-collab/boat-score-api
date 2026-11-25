import test from 'node:test';import assert from 'node:assert/strict';import {auditHoldoutOrderByWinner} from './audit-holdout-order-by-winner.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[4,7,5,6,2,1][i]}));
const d=(date,o)=>({date,reports:[{records:[{resultVerified:true,finishOrder:o,racers}]}]});
test('counts only holdout and groups by winning boat',()=>{const r=auditHoldoutOrderByWinner([d('20261101',[1,2,3,4,5,6]),d('20261102',[2,1,3,4,5,6]),d('20261103',[4,2,1,3,5,6])]);assert.deepEqual(r.holdoutDates,['20261103']);assert.equal(r.byWinner[4].races,1);assert.equal(r.byWinner[1].races,0);});
