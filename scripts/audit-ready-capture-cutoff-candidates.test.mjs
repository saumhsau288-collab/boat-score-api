import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCutoffCandidates} from './audit-ready-capture-cutoff-candidates.mjs';
const record={date:'20261120',venue:17,race:2,httpStatus:200,response:{ready:true},receivedAt:'2026-11-19T23:48:25.694Z'};
const candidate={date:'20261120',venue:17,race:2,cutoffCandidateUtc:'2026-11-20T01:42:00Z'};
test('candidate lead is diagnostic only',()=>{
 const out=auditCutoffCandidates({records:[record]},[candidate]);
 assert.equal(out.withCandidate,1);
 assert.equal(out.candidateAfterReceipt,1);
 assert.equal(out.rows[0].leadMinutes,113.6);
 assert.equal(out.eligibleForCalibration,0);
});
test('no candidate and failed HTTP excluded',()=>{
 const out=auditCutoffCandidates({records:[record,{...record,race:3,httpStatus:503}]},[]);
 assert.equal(out.ready,1);
 assert.equal(out.withCandidate,0);
});
test('candidate earlier than receipt is flagged',()=>{
 const out=auditCutoffCandidates({records:[record]},[{...candidate,cutoffCandidateUtc:'2026-11-19T23:00:00Z'}]);
 assert.equal(out.candidateBeforeReceipt,1);
});
test('duplicate candidates are rejected',()=>{
 assert.throws(()=>auditCutoffCandidates({records:[record]},[candidate,candidate]),/duplicate_cutoff_candidate/);
});

test('malformed capture identity does not match cutoff',()=>{
 const out=auditCutoffCandidates({records:[{...record,date:'unknown'}]},[candidate]);
 assert.equal(out.withCandidate,0);
 assert.equal(out.eligibleForCalibration,0);
});
test('invalid received timestamp cannot produce lead minutes',()=>{
 const out=auditCutoffCandidates({records:[{...record,receivedAt:'invalid'}]},[candidate]);
 assert.equal(out.withCandidate,0);
 assert.equal(out.rows[0].leadMinutes,null);
});
