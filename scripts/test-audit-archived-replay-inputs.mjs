import assert from 'node:assert/strict';
import {auditArchivedReplayInputs as audit} from './audit-archived-replay-inputs.mjs';
const boats=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,localWinRate:5,motorTwoWinRate:40,recent50WinRate:30,exhibitionScore:6}));
const result=audit({records:[
 {date:'20261118',venue:1,race:3,httpStatus:200,response:{ready:true,rankedScores:[1,2,3]}},
 {date:'20261118',venue:1,race:4,httpStatus:200,response:{ready:true,scoreInputsByBoat:boats}},
 {date:'20261118',venue:1,race:5,httpStatus:200,response:{ready:true,scoreInputsByBoat:Object.fromEntries(boats.map(b=>[b.boat,b]))}}
]});
assert.equal(result.total,3);
assert.equal(result.ready,3);
assert.equal(result.sixOriginalInputs,2);
assert.equal(result.outputScoresWithoutInputs,1);
assert.equal(result.eligibleForHistoricalReplay,0);
assert(result.rows.every(r=>r.eligibleForHistoricalReplay===false));
assert.throws(()=>audit({records:null}));
console.log('Archived original replay input audit tests passed');
