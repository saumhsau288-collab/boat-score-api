import test from 'node:test';import assert from 'node:assert/strict';import {auditTopThreeSandwich} from './audit-top-three-sandwich.mjs';
const orders=[[1,5,2,3,4,6],[5,1,6,2,3,4],[5,6,1,2,3,4],[4,2,1,3,5,6],[1,4,5,2,3,6]];
test('distinguishes inner/outer sandwich and remaining-inside patterns',()=>{
 const rows=orders.map((finishOrder,i)=>({date:'20261120',venue:1,race:i+1,resultVerified:true,finishOrder}));
 const r=auditTopThreeSandwich(rows);
 assert.equal(r.eligible,5);
 for(const p of Object.values(r.patterns))assert.equal(p.count,1);
});
test('rejects duplicate race',()=>assert.throws(()=>auditTopThreeSandwich([{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:orders[0]},{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:orders[0]}]),/duplicate race/));
