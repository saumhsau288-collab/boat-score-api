import test from 'node:test';import assert from 'node:assert/strict';import {auditDailyAbilityRank} from './audit-daily-ability-rank.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[8,7,4,3,6,2][i]}));
test('keeps daily counts separate',()=>{const base={venue:1,race:1,resultVerified:true,finishOrder:[1,2,3,4,5,6],racers};const r=auditDailyAbilityRank([{...base,date:'20261119'},{...base,date:'20261120'}]);assert.equal(r.byDay['20261119'].eligible,1);assert.equal(r.byDay['20261120'].innerTopHalf.second,1);});
