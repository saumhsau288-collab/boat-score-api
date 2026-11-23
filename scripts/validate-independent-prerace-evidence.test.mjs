import assert from 'node:assert/strict';
import {validatePreRaceEvidence,evaluateEvidenceBatch} from './validate-independent-prerace-evidence.mjs';
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(1000+i),entryCourse:i+1,
 nationalRate:6,localRate:0,averageST:.15,motor2Rate:40,exhibitionTime:6.8,last50CoursePodiumRate:50
}));
const row={date:'20261123',venue:2,race:1,capturedAt:'2026-11-23T00:00:00Z',
 officialCutoffAt:'2026-11-23T01:00:00Z',cutoffSourceVerified:true,
 captureSourceVerified:true,modelVersion:'independent-v1',featureSource:'official-beforeinfo',
 racers};
assert.equal(validatePreRaceEvidence(row).eligible,true);
assert.ok(validatePreRaceEvidence({...row,capturedAt:row.officialCutoffAt}).errors.includes('unverified_pre_cutoff_timing'));
assert.ok(validatePreRaceEvidence({...row,racers:racers.map((r,i)=>i===5?{...r,entryCourse:1}:r)}).errors.includes('unverified_entry_courses'));
assert.ok(validatePreRaceEvidence({...row,racers:racers.map((r,i)=>i===0?{...r,motor2Rate:null}:r)}).errors.includes('missing_six_racer_features'));
assert.ok(validatePreRaceEvidence({...row,featureSource:''}).errors.includes('missing_feature_source'));
const batch=evaluateEvidenceBatch([row,{...row}]);
assert.equal(batch.eligibleCount,1);
assert.equal(batch.heldCount,1);
assert.ok(batch.held[0].errors.includes('duplicate_race'));
console.log('Research pre-race evidence gate tests passed');
