import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateCandidateTrifectaArchive} from './evaluate-candidate-trifecta-archive.mjs';
const record=(order)=>({resultVerified:true,finishOrder:order,racers:[8,7,6,5,4,3].map((nationalWinRate,i)=>({boat:i+1,nationalWinRate}))});
test('later dates only; frame baseline and candidate counted independently',()=>{
 const days=['20261101','20261102','20261103'].map(date=>({date,reports:[{records:[record([1,2,3,4,5,6])]}]}));
 const r=evaluateCandidateTrifectaArchive(days);
 assert.deepEqual(r.testDates,['20261103']);assert.equal(r.candidate.races,1);assert.equal(r.frameOnly.exact,1);
 assert.equal(r.candidate.top12>=r.candidate.exact,true);
});
test('rejects insufficient days',()=>assert.throws(()=>evaluateCandidateTrifectaArchive([]),/three/));
