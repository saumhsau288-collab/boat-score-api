import assert from 'node:assert/strict';
import {inspectResearchRefreshCandidateIntegrity as inspect} from './inspect-research-refresh-candidate-integrity.mjs';
const date='20261120';
const schedule={status:'daily_candidates_not_authenticated',date,venue:2,candidates:Array.from({length:12},(_,i)=>{
 const cutoff=new Date(Date.UTC(2026,10,20,1,45+i*27));
 const refresh=new Date(cutoff.getTime()-600000);
 const jst=new Date(cutoff.getTime()+9*3600000);
 return {race:i+1,cutoffCandidateJst:jst.toISOString().slice(11,16),refreshCandidateAt:refresh.toISOString(),verified:false,refreshAuthorized:false};
})};
assert.equal(inspect(schedule).status,'candidate_integrity_consistent_not_authenticated');
const wrong=structuredClone(schedule);wrong.candidates[3].refreshCandidateAt='2026-11-20T00:00:00.000Z';
assert.ok(inspect(wrong).issues.includes('race_4_refresh_time_mismatch'));
const unauthorized=structuredClone(schedule);unauthorized.candidates[0].refreshAuthorized=true;
assert.ok(inspect(unauthorized).issues.includes('race_1_unauthorized_flag'));
const swapped=structuredClone(schedule);swapped.candidates[0].race=2;
assert.ok(inspect(swapped).issues.includes('race_1_invalid_identity_or_time'));
assert.equal(inspect(null).status,'invalid_candidate_schedule');
console.log('Research refresh candidate integrity tests passed');
