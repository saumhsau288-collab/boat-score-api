import test from 'node:test';
import assert from 'node:assert/strict';
import {auditOfficialJoinAdjacentAbility} from './audit-official-join-adjacent-ability.mjs';
const base={date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[5,6,2,1,3,4],
 racers:[6,5,4,3,2,1].map(boat=>({boat,nationalWinRate:boat===6?7:4}))};
test('does not misrepresent historical unverified B/K snapshots as pre-race',()=>{
 const r=auditOfficialJoinAdjacentAbility({records:[base]});
 assert.equal(r.eligible,0);assert.equal(r.excluded,1);
});
test('accepts explicitly verified captures with shuffled racer order',()=>{
 const r=auditOfficialJoinAdjacentAbility({records:[{...base,asOfVerified:true,capturedBeforeStart:true}]});
 assert.equal(r.eligible,1);assert.equal(r.groups.high.neighborPodium,1);
});
