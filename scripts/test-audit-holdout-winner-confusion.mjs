import test from 'node:test';import assert from 'node:assert/strict';import {auditHoldoutWinnerConfusion} from './audit-holdout-winner-confusion.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[4,7,5,6,2,1][i]}));
const day=(date,finishOrder)=>({date,reports:[{records:[{resultVerified:true,finishOrder,racers}]}]});
test('confusion matrix contains only last third of dates',()=>{const x=auditHoldoutWinnerConfusion([day('20261103',[4,2,1,3,5,6]),day('20261101',[1,2,3,4,5,6]),day('20261102',[2,1,3,4,5,6])]);assert.equal(x.eligible,1);assert.equal(Object.values(x.matrix[4]).reduce((a,b)=>a+b,0),1);assert.equal(Object.values(x.matrix[1]).reduce((a,b)=>a+b,0),0);});
