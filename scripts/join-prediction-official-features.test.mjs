import test from 'node:test';
import assert from 'node:assert/strict';
import {joinPredictionAndOfficialFeatures} from './join-prediction-official-features.mjs';
const base={date:'20261120',venue:2,race:1};
const prediction={...base,httpStatus:200,receivedAt:'2026-11-20T00:00:00Z',response:{ready:true},responseSha256:'prediction-hash'};
const official={...base,status:'captured_research_inputs',receivedAt:'2026-11-19T23:00:00Z',racers:Array.from({length:6},(_,i)=>({boat:i+1})),responseSha256:'official-hash'};
test('matched separate official data remains unverified for calibration',()=>{
 const x=joinPredictionAndOfficialFeatures({records:[prediction]},[official]);
 assert.equal(x.withUsableOfficialSnapshot,1);assert.equal(x.officialCapturedBeforePrediction,1);
 assert.equal(x.rows[0].usedByDeployedPredictor,'unverified');assert.equal(x.eligibleForCalibration,0);
});
test('future official capture cannot be treated as earlier input',()=>{
 const x=joinPredictionAndOfficialFeatures({records:[prediction]},[{...official,receivedAt:'2026-11-20T01:00:00Z'}]);
 assert.equal(x.officialCapturedBeforePrediction,0);assert.equal(x.originalInputsVerified,0);
});
test('duplicate official snapshots are ambiguous',()=>{
 const x=joinPredictionAndOfficialFeatures({records:[prediction]},[official,official]);
 assert.equal(x.rows[0].usableOfficialSnapshots,2);assert.equal(x.withUsableOfficialSnapshot,0);
});
