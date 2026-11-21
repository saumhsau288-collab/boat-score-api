import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCutoffDiagnostics} from './compare-cutoff-diagnostics.mjs';
test('only unverified scoped diagnostics are displayed, never calibrated',()=>{
 const r=compareCutoffDiagnostics([{date:'20261120',venue:21,race:5,verified:false,raceScopedCutoffDiagnostic:{candidateCutoffJst:'10:36',verified:false,eligibleForCalibration:false}},{date:'20261120',venue:21,race:6,verified:false,raceScopedCutoffDiagnostic:{candidateCutoffJst:'08:99',verified:false,eligibleForCalibration:false}}]);
 assert.equal(r.unverifiedRaceScoped,1);
 assert.equal(r.rows[0].diagnosticCutoffJst,'10:36');
 assert.equal(r.rows[1].diagnosticCutoffJst,null);
 assert.equal(r.verifiedCutoffs,0);
 assert.equal(r.eligibleForCalibration,0);
});
test('rejects implicit or claimed verification',()=>{
 const r=compareCutoffDiagnostics([{date:'20261120',venue:21,race:5,verified:true,raceScopedCutoffDiagnostic:{candidateCutoffJst:'10:36',verified:false,eligibleForCalibration:false}},{date:'20261120',venue:21,race:4,verified:false,raceScopedCutoffDiagnostic:{candidateCutoffJst:'10:09'}}]);
 assert.equal(r.unverifiedRaceScoped,0);
});
