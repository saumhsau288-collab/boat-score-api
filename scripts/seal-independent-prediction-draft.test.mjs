import assert from 'node:assert/strict';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {sealIndependentPredictionDraft} from './seal-independent-prediction-draft.mjs';
import {METHOD_IDS} from '../generate-twelve-independent-methods.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
 expectedEntryCourse:i+1,exhibitionTime:6.8,last50Score:50}));
const snap=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
 capturedAt:'2026-11-23T00:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
 source:'official_live_entry',racers});
const a=sealIndependentPredictionDraft(snap),b=sealIndependentPredictionDraft(snap);
assert.equal(a.saved,false);
assert.equal(a.sha256,b.sha256);
assert.equal(a.sha256.length,64);
assert.equal(a.draft.eligibleForVerifiedAccuracy,false);
assert.deepEqual(Object.keys(a.draft.prediction.methods),METHOD_IDS);
assert.equal(sealIndependentPredictionDraft({...snap,ready:false}).saved,false);
const missing=structuredClone(snap);
missing.scoringReady=false;
missing.racers[0].values.averageST=null;
missing.racers[0].missing=['averageST'];
assert.equal(sealIndependentPredictionDraft(missing).reason,'incomplete_six_racer_features');
const falseReady=structuredClone(snap);
falseReady.racers[0].values.averageST=null;
assert.equal(sealIndependentPredictionDraft(falseReady).reason,'incomplete_six_racer_features');
const duplicateCourse=structuredClone(snap);
duplicateCourse.racers[1].values.expectedEntryCourse=1;
assert.equal(sealIndependentPredictionDraft(duplicateCourse).reason,'unverified_entry_courses');
const changed=structuredClone(snap);
changed.racers[0].values.nationalWinRate=7;
assert.notEqual(sealIndependentPredictionDraft(changed).sha256,a.sha256);
console.log('Deterministic 12-method research draft and SHA256 tests passed');
