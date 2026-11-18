import assert from 'node:assert/strict';
import {summarizeCutoffCandidates} from './summarize-cutoff-candidates.mjs';
const r={date:'20261118',venue:1,race:1,receivedAt:'2026-11-18T13:00:00Z',response:{ready:true}};
const e={date:r.date,venue:1,race:1,pageIdentity:{verified:false},cutoffCandidate:{status:'candidate_needs_official_page_identity_verification',cutoffAt:'2026-11-18T06:00:00Z'}};
const x=summarizeCutoffCandidates({date:r.date,records:[r]},{records:[e]});
assert.equal(x.counts.readyAfterCandidate,1);assert.equal(x.calibrationEligible,0);
assert.equal(summarizeCutoffCandidates({records:[r]},{records:[]}).counts.readyMissingCandidate,1);
console.log('Cutoff candidate diagnostics passed');
