import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('official cutoff capture suppresses unverified race identity before exposing candidate',()=>{
 const source=fs.readFileSync('scripts/capture-official-cutoff-source.mjs','utf8');
 assert.match(source,/identity\.status==='identity_markers_consistent_not_authenticated'/);
 assert.match(source,/candidate_suppressed_page_identity_unverified/);
 assert.match(source,/rawCutoffCandidateForDiagnostics:rawCandidate/);
 assert.match(source,/verified:false,officialCutoffAt:null/);
});

test('race-scoped schedule diagnostics cannot authenticate or calibrate official cutoff evidence',()=>{
 const source=fs.readFileSync('scripts/capture-official-cutoff-source.mjs','utf8');
 assert.match(source,/extractCutoffFromHtmlScheduleTable\(\{html:body,expectedRace:race,sourceVerified:true\}\)/);
 assert.match(source,/raceScopedCutoffDiagnostic=\{candidateCutoffJst:scopedSchedule\.cutoffJst,parseReason:scopedSchedule\.reason,verified:false,eligibleForCalibration:false\}/);
 assert.match(source,/cutoffCandidate:candidate,rawCutoffCandidateForDiagnostics:rawCandidate,raceScopedCutoffDiagnostic/);
 assert.match(source,/verified:false,officialCutoffAt:null/);
});
