import assert from 'node:assert/strict';
import {auditCaptureScoreInputs} from './audit-capture-score-inputs.mjs';
const six=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,localWinRate:4,motorTwoWinRate:30,recent50WinRate:20,exhibitionScore:50}));
const base={date:'20261118',attempted:3,authenticatedBeforeRace:false,records:[
 {response:{ready:true,scoreInputsByBoat:six}},
 {response:{ready:true}},
 {response:{ready:true,scoreInputsByBoat:six.map((r,i)=>i===0?{...r,recent50WinRate:null}:r)}}]};
const result=auditCaptureScoreInputs(base);
assert.equal(result.readyPredictions,3);
assert.equal(result.readyCompleteFiveInputs,1);
assert.equal(result.readyMissingInputEvidence,1);
assert.equal(result.readyInvalidOrIncompleteInputs,1);
assert.equal(result.validRacerFieldCounts.recent50WinRate,11);
assert.equal(result.accuracyCalculationPermitted,false);
assert.equal(result.weightChangesPermitted,false);
assert.throws(()=>auditCaptureScoreInputs({...base,authenticatedBeforeRace:true}));
console.log('Captured score input audit tests passed');
