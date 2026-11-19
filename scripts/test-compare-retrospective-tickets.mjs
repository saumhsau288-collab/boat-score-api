import assert from 'node:assert/strict';
import {compareRetrospectiveTickets} from './compare-retrospective-tickets.mjs';
const six=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const c={records:[{date:'20261118',venue:1,race:1,response:{ready:true,main:six,upset:six.map(x=>[...x].reverse())}},{date:'20261118',venue:1,race:2,response:{ready:false}}]};
const r=compareRetrospectiveTickets(c,[{date:'20261118',venue:1,race:1,podium:[1,2,3],resultVerified:true}]);
assert.equal(r.compared,1);assert.equal(r.mainContains,1);assert.equal(r.preRaceAccuracy,null);assert.equal(r.eligibleForWeightTuning,false);assert.equal(r.excluded.no_result_row,1);
console.log('Retrospective ticket diagnostic checks passed (synthetic only)');
