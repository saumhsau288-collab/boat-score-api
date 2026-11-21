import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRepeatedCutoffCandidates} from './audit-repeated-cutoff-candidates.mjs';
test('flags different races sharing the same venue deadline',()=>{
 const records=[1,2,6].map(race=>({date:'20261120',venue:17,race,cutoffCandidate:{cutoffAt:'2026-11-20T01:16:00Z'}}));
 const out=auditRepeatedCutoffCandidates(records);
 assert.equal(out.suspiciousGroups,1);
 assert.deepEqual(out.collisions[0].races,[1,2,6]);
 assert.equal(out.verifiedCutoffs,0);
});
test('does not flag distinct races with distinct cutoffs',()=>{
 const records=[{date:'20261120',venue:17,race:1,cutoffAt:'2026-11-20T01:16:00Z'},
 {date:'20261120',venue:17,race:2,cutoffAt:'2026-11-20T01:40:00Z'}];
 assert.equal(auditRepeatedCutoffCandidates(records).suspiciousGroups,0);
});
