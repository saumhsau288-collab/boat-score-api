import assert from 'node:assert/strict';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {bridgeRacerEvidenceToMethodGate} from './bridge-racer-evidence-to-method-gate.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
 expectedEntryCourse:i+1,exhibitionTime:6.8,last50Score:50}));
const snapshot=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
 capturedAt:'2026-11-23T00:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
 source:'official_live_entry',racers});
assert.equal(snapshot.ready,true);
assert.equal(snapshot.scoringReady,true);
const held=bridgeRacerEvidenceToMethodGate(snapshot,{modelVersion:'research-v1'});
assert.equal(held.eligible,false);
assert.ok(held.errors.includes('unverified_provenance'));
const conditional=bridgeRacerEvidenceToMethodGate(snapshot,{modelVersion:'research-v1',
 captureSourceVerified:true,cutoffSourceVerified:true});
assert.equal(conditional.eligible,true);
assert.equal(conditional.record.racers.length,6);
const incomplete=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
 capturedAt:'2026-11-23T00:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
 source:'official_live_entry',racers:racers.map((r,i)=>i===0?{...r,averageST:null}:r)});
assert.equal(bridgeRacerEvidenceToMethodGate(incomplete,{modelVersion:'research-v1',
 captureSourceVerified:true,cutoffSourceVerified:true}).eligible,false);
console.log('Existing racer evidence schema bridge tests passed');
