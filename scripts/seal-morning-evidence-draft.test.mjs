import assert from 'node:assert/strict';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {sealMorningEvidenceDraft} from './seal-morning-evidence-draft.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
 expectedEntryCourse:null,exhibitionTime:null,last50Score:50}));
const snap=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
 capturedAt:'2026-11-22T23:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
 source:'official_live_entry',racers});
const a=sealMorningEvidenceDraft(snap),b=sealMorningEvidenceDraft(snap);
assert.equal(a.saved,false);
assert.equal(a.sha256,b.sha256);
assert.equal(a.envelope.phase,'morning');
assert.equal(a.envelope.racers.length,6);
assert.equal(a.envelope.racers[0].values.exhibitionTime,null);
assert.equal(a.envelope.methodCount,0);
assert.equal(a.envelope.eligibleForVerifiedAccuracy,false);
const changed=structuredClone(snap);
changed.racers[0].values.averageST=null;
assert.equal(sealMorningEvidenceDraft(changed).reason,'missing_required_phase_features');
assert.equal(sealMorningEvidenceDraft({...snap,ready:false}).reason,'incomplete_racer_snapshot');
console.log('Morning six-racer research envelope tests passed');
