import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFinishOrderPairs} from './audit-finish-order-pairs.mjs';
const r={date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[5,6,1,2,3,4]};
test('separates 2nd and 3rd boat frequencies',()=>{
 const x=auditFinishOrderPairs([r,{...r,race:2,finishOrder:[5,1,6,2,3,4]}]);
 assert.equal(x.eligible,2);assert.equal(x.byWinner['5'].second['6'],1);
 assert.equal(x.byWinner['5'].third['6'],1);
 assert.equal(x.byWinner['5'].secondRate['6'],0.5);
});
test('rejects duplicate race keys',()=>assert.throws(()=>auditFinishOrderPairs([r,r]),/duplicate race/));
