import test from 'node:test';import assert from 'node:assert/strict';import {auditGapStrata} from './audit-gap-strata.mjs';
const racers=(a,b)=>Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i+1===a?8:i+1===b?7:4}));
test('stratifies gap and counts second place',()=>{const r=auditGapStrata([{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,3,5,2,4,6],racers:racers(1,5)}]);assert.equal(r.byGap[3].races,1);assert.equal(r.byGap[3].betweenSecond,1);assert.equal(r.byGap[3].betweenSecondRate,1);});
test('gap zero has no intervening frame',()=>{const r=auditGapStrata([{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,3,2,4,5,6],racers:racers(1,2)}]);assert.equal(r.byGap[0].betweenPodium,0);});
