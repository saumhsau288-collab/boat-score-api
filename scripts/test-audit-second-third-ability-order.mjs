import test from 'node:test';import assert from 'node:assert/strict';import {auditSecondThirdAbilityOrder} from './audit-second-third-ability-order.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[4,7,5,6,2,1][i]}));
test('counts direction of second-third win-rate gap',()=>{const x=auditSecondThirdAbilityOrder([{resultVerified:true,finishOrder:[4,1,2,3,5,6],racers},{resultVerified:true,finishOrder:[1,2,3,4,5,6],racers}]);assert.equal(x.byWinner[4].thirdHigher,1);assert.equal(x.byWinner[1].secondHigher,1);assert.equal(x.eligible,2);});
