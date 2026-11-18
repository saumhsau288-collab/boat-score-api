import assert from 'node:assert/strict';
import {calibrateExistingBoatScoreModule} from './calibrate-existing-boat-score-module.mjs';
const r=calibrateExistingBoatScoreModule([{date:'20261118',venue:2,race:1,boats:[],actual:[1,2,3]}]);
assert.equal(r.status,'blocked_unverified_history');
assert.equal(r.productionChanged,false);
console.log('Existing Boat Score calibration bridge blocks unverified history');
