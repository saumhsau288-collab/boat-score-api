import test from 'node:test';import assert from 'node:assert/strict';import {evaluateChronologicalHeuristics} from './evaluate-chronological-heuristics.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[3,7,5,4,2,1][i]}));
const day=(date,finishOrder)=>({date,reports:[{records:[{date,venue:1,race:1,resultVerified:true,finishOrder,racers}]}]});
test('keeps final third strictly held out',()=>{const r=evaluateChronologicalHeuristics([day('20261103',[2,1,3,4,5,6]),day('20261101',[1,2,3,4,5,6]),day('20261102',[1,2,3,4,5,6])]);assert.deepEqual(r.trainDates,['20261101','20261102']);assert.deepEqual(r.testDates,['20261103']);assert.equal(r.holdout.races,1);});
test('rejects duplicate dates',()=>assert.throws(()=>evaluateChronologicalHeuristics([day('20261101',[1,2,3,4,5,6]),day('20261101',[1,2,3,4,5,6])])));
