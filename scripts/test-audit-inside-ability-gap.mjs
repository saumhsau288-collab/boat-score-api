import test from 'node:test';import assert from 'node:assert/strict';import {auditInsideAbilityGap} from './audit-inside-ability-gap.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[4,7,5,6,2,1][i]}));
test('bins win-rate gap and preserves finish order',()=>{const x=auditInsideAbilityGap([{resultVerified:true,finishOrder:[4,1,2,3,5,6],racers},{resultVerified:true,finishOrder:[1,2,3,4,5,6],racers}]);assert.equal(x.groups['outside +2 or more'].insideSecond,1);assert.equal(x.groups['inside +2 or more'].insideSecond,1);});
