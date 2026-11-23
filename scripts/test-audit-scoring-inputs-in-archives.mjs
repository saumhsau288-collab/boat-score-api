import assert from 'node:assert/strict';
import {auditScoringInputsInArchives} from './audit-scoring-inputs-in-archives.mjs';
const boats=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6,localWinRate:5,motorTwoWinRate:40,recent50WinRate:30,exhibitionScore:70,avgStart:.15}));
const result=auditScoringInputsInArchives([{date:'20261118',records:[
 {response:{ready:true,racers:boats}},
 {response:{ready:true,racers:boats.map((r,i)=>i===0?{...r,avgStart:null}:r)}},
 {response:{ready:true,picks:[1,2,3,4,5,6]}},
 {response:{ready:false,racers:boats}}
]}]);
assert.equal(result.readyResponses,3);
assert.equal(result.candidateSixBoatArrays,2);
assert.equal(result.completeForComparison,1);
assert.equal(result.missingByField.avgStart,1);
assert.equal(result.observedArrayFields.racers,2);
assert.equal(result.observedArrayFields.picks,1);
assert.equal(auditScoringInputsInArchives([]).completeForComparison,0);
console.log('PASS: archive scoring inputs audit requires exact raw racer fields');
