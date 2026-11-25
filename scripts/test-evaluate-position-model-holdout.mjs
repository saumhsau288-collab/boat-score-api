import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePositionModelHoldout} from './evaluate-position-model-holdout.mjs';

const makeDay=date=>({date,reports:[{records:[{
 resultVerified:true,
 finishOrder:[1,2,3,4,5,6],
 racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:7-i*.5,localWinRate:7-i*.5}))
}]}]});
const training=['20261112','20261113','20261114','20261115','20261116','20261117'].map(makeDay);
test('training remains frozen as new dates arrive',()=>{
 const a=evaluatePositionModelHoldout([...training,makeDay('20261118')]);
 const b=evaluatePositionModelHoldout([...training,makeDay('20261118'),makeDay('20261122')]);
 assert.equal(a.trainingRaces,6);
 assert.equal(b.trainingRaces,6);
 assert.deepEqual(b.trainingDates,a.trainingDates);
 assert.deepEqual(b.independentFutureDates,['20261122']);
 assert.equal(a.futureIndependent.status,'NO_NEW_DATES');
 assert.equal(a.futureIndependent.races,0);
 assert.equal(b.futureIndependent.status,'RETROSPECTIVE_ARCHIVE_ONLY');
 assert.equal(b.futureIndependent.races,1);
 assert.equal(b.futureIndependent.originalExact,1);
 assert.equal(b.futureIndependent.hybridExact,1);
 assert.equal(a.holdout.races,1);
 assert.equal(b.holdout.races,2);
});
test('missing a frozen training day fails closed',()=>{
 assert.throws(()=>evaluatePositionModelHoldout([...training.slice(1),makeDay('20261122')]),/frozen/);
});

test('duplicate and malformed daily dates fail closed',()=>{
 assert.throws(()=>evaluatePositionModelHoldout([...training,makeDay('20261118'),makeDay('20261118')]),/duplicate evaluation date/);
 assert.throws(()=>evaluatePositionModelHoldout([...training,makeDay('bad-date')]),/invalid evaluation date/);
});
