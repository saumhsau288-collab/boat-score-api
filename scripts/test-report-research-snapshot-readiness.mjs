import assert from 'node:assert/strict';
import {reportResearchSnapshotReadiness as report} from './report-research-snapshot-readiness.mjs';
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:6.1,localWinRate:5.4,motorTwoWinRate:40,
 recent50Verified:false,entryCourseVerified:false
}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',
 date:'20261120',venue:18,race:1,racers,preRaceIndependentlyVerified:false};
const first=report(snapshot);
assert.equal(first.status,'official_six_ready');
assert.equal(first.officialRacerCount,6);
assert.deepEqual(first.boats,[1,2,3,4,5,6]);
assert.equal(first.readyForResearchMorningScoring,false);
assert.equal(first.eligibleForCalibration,false);
assert(first.missing.includes('six_independently_verified_recent50_records'));
assert(first.missing.includes('independent_pre_race_authentication'));
assert.equal(report({...snapshot,racers:racers.slice(1)}).status,'official_six_not_ready');
assert.equal(report({...snapshot,racers:racers.map(r=>({...r,sourceVerified:false}))}).officialRacerCount,0);
const complete=report({...snapshot,racers:racers.map(r=>({...r,recent50Verified:true,entryCourseVerified:true}))});
assert.equal(complete.readyForResearchMorningScoring,true);
assert.equal(complete.eligibleForCalibration,false);
console.log('Research snapshot readiness tests passed');
