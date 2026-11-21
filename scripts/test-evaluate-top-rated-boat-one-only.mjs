import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateTopRatedBoatOneOnly} from './evaluate-top-rated-boat-one-only.mjs';
const record=(best,tie=false)=>({resultVerified:true,finishOrder:[1,2,3,4,5,6],racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i+1===best?9:(tie&&i===1?9:6-i/10)}))});
test('selects only unique boat-one top ability on later date',()=>{
 const days=['20261101','20261102','20261103'].map(date=>({date,reports:[{records:[record(1),record(2),record(1,true)]}]}));
 const r=evaluateTopRatedBoatOneOnly(days);
 assert.equal(r.selected,1);assert.equal(r.excludedNotTop,1);assert.equal(r.excludedTied,1);
 assert.equal(r.baseline.exact,1);assert.equal(r.candidate.races,1);
});
