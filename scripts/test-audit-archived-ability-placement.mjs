import test from 'node:test';import assert from 'node:assert/strict';import {auditArchivedAbilityPlacement} from './audit-archived-ability-placement.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i===0?8:i===4?7:4}));
test('archive ability grouping is clearly exploratory',()=>{const r=auditArchivedAbilityPlacement([{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,5,2,3,4,6],racers}]);assert.equal(r.groups.splitInnerOuter.bothPodium,1);assert.match(r.warning,/POST-RACE/);});
