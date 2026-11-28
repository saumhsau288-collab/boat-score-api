import assert from 'node:assert/strict';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {assessPredictionPhase} from './assess-prediction-phase.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
 expectedEntryCourse:null,exhibitionTime:null,last50Score:50}));
const morning=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
 capturedAt:'2026-11-22T23:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
 source:'official_live_entry',racers});
assert.equal(morning.scoringReady,false);
assert.equal(assessPredictionPhase(morning,{phase:'morning'}).eligible,true);
assert.equal(assessPredictionPhase(morning,{phase:'morning'}).methodCount,0);
assert.equal(assessPredictionPhase(morning,{phase:'precutoff'}).eligible,false);
const complete=structuredClone(morning);
complete.racers.forEach((r,i)=>{r.values.expectedEntryCourse=i+1;r.values.exhibitionTime=6.8;});
assert.equal(assessPredictionPhase(complete,{phase:'precutoff'}).methodCount,12);
complete.racers[1].values.expectedEntryCourse=1;
assert.equal(assessPredictionPhase(complete,{phase:'precutoff'}).reason,'invalid_entry_courses');
complete.racers[1].values.averageST=null;
assert.equal(assessPredictionPhase(complete,{phase:'morning'}).eligible,false);
console.log('Morning and precutoff feature phase tests passed');
