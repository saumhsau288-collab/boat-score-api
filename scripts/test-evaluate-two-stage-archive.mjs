import test from 'node:test';import assert from 'node:assert/strict';import {evaluateTwoStageArchive} from './evaluate-two-stage-archive.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:[4,7,5,6,2,1][i]}));
const d=(date,finishOrder)=>({date,reports:[{records:[{date,venue:1,race:1,resultVerified:true,finishOrder,racers}]}]});
test('holds out final chronological third and evaluates exactly',()=>{const r=evaluateTwoStageArchive([d('20261103',[2,4,1,3,5,6]),d('20261101',[1,2,3,4,5,6]),d('20261102',[2,1,3,4,5,6])]);assert.deepEqual(r.holdoutDates,['20261103']);assert.equal(r.candidatesTried,42);assert.equal(r.holdout.races,1);});
test('rejects duplicate dates',()=>assert.throws(()=>evaluateTwoStageArchive([d('20261101',[1,2,3,4,5,6]),d('20261101',[1,2,3,4,5,6]),d('20261102',[1,2,3,4,5,6])])));
