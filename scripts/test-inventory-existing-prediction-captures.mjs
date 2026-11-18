import assert from 'node:assert/strict';
import {inventoryExistingPredictionCaptures} from './inventory-existing-prediction-captures.mjs';
const x=inventoryExistingPredictionCaptures([{date:'20261118',authenticatedBeforeRace:false,records:[{response:{ready:true,prediction:{main:['1-2-3']},scoreInputsByBoat:[1,2,3,4,5,6]}},{response:{ready:false}}]}]);
assert.equal(x.records,2);assert.equal(x.ready,1);assert.equal(x.withPrediction,1);
assert.equal(x.withSixBoatInputs,1);assert.equal(x.withVerifiedPreRaceEvidence,0);
console.log('Existing predictor capture inventory test passed');
