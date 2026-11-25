import test from 'node:test';import assert from 'node:assert/strict';import {auditInsideVersusAbility} from './audit-inside-versus-ability.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[4,7,5,6,2,1][i]}));
test('separates inside frame advantage from win-rate advantage',()=>{const r=auditInsideVersusAbility([{resultVerified:true,finishOrder:[4,1,2,3,5,6],racers},{resultVerified:true,finishOrder:[1,2,3,4,5,6],racers}]);assert.equal(r.groups.outsideHigher.insideSecond,1);assert.equal(r.groups.insideHigher.insideSecond,1);});
