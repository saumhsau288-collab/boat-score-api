import test from 'node:test';import assert from 'node:assert/strict';import {auditBetweenByCandidateRank} from './audit-between-by-rank.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[8,5,4,3,7,2][i]}));
test('stratifies candidate ability ranks',()=>{const r=auditBetweenByCandidateRank([{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[1,2,5,3,4,6],racers}]);assert.equal(r.groups[2].between.topHalf.second,1);assert.equal(r.groups[3].between.bottomHalf.races,1);});
