import test from 'node:test';import assert from 'node:assert/strict';import {auditInterveningByBoat} from './audit-intervening-by-boat.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i===0?8:i===4?7:4}));
test('reports each intervening boat separately',()=>{const r=auditInterveningByBoat([{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,3,5,2,4,6],racers}]);assert.equal(r.byBoat[2].candidateRaces,1);assert.equal(r.byBoat[3].second,1);assert.equal(r.byBoat[4].podium,0);assert.equal(r.byBoat[1].secondRate,null);});
