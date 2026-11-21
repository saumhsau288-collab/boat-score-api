import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRelativeAbilityPlacement} from './audit-relative-ability-placement.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:9-i,localWinRate:9-i}));
test('separates first second third positions and ability ranks',()=>{
 const x=auditRelativeAbilityPlacement([{racers,resultVerified:true,finishOrder:[1,3,2,4,5,6]}]);
 assert.equal(x.eligibleRaces,1);
 assert.equal(x.byBoatRank['1']['1'].first,1);
 assert.equal(x.byBoatRank['2']['2'].third,1);
 assert.equal(x.byBoatRank['3']['3'].second,1);
 assert.equal(x.byBoatRank['1']['1'].top3,1);
});
test('excludes tied ranks rather than assigning arbitrary ability rank',()=>{
 const tied=racers.map(x=>({...x}));
 tied[1].nationalWinRate=9;tied[1].localWinRate=9;
 const x=auditRelativeAbilityPlacement([{racers:tied,resultVerified:true,finishOrder:[1,2,3,4,5,6]}]);
 assert.equal(x.tiedRanks,1);assert.equal(x.eligibleRaces,0);
});
