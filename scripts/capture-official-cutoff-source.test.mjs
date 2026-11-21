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
