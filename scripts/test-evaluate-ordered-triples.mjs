import test from 'node:test';import assert from 'node:assert/strict';import {evaluateOrderedTriples} from './evaluate-ordered-triples.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:7-i}));
const day=(date,finishOrder)=>({date,reports:[{records:[{resultVerified:true,finishOrder,racers}]}]});
test('uses only early dates for frequency training',()=>{const r=evaluateOrderedTriples([day('20261103',[2,1,3,4,5,6]),day('20261101',[1,2,3,4,5,6]),day('20261102',[1,2,3,4,5,6])]);assert.deepEqual(r.trainDates,['20261101','20261102']);assert.deepEqual(r.testDates,['20261103']);assert.equal(r.frequencyOnly.exact,0);});
