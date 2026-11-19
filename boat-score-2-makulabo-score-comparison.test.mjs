import test from 'node:test';
import assert from 'node:assert/strict';
import {compareMakulaboWithScores} from './boat-score-2-makulabo-score-comparison.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),firstPlaceRate:20,top3Rate:60}));
const provenance={preRaceVerified:true,allInputsPreRaceVerified:true,raceDate:'20261113'};
const inputs=racers.map(r=>({boat:r.boat,racerId:r.racerId,nationalWinRate:6,localWinRate:0,motorTwoWinRate:40,exhibitionScore:70}));
test('compares verified finish rates without changing scores',()=>{
 const r=compareMakulaboWithScores({verified:true,racers},inputs,provenance);
 assert.equal(r.status,'evaluated');assert.equal(r.racers[0].score,53.5);assert.equal(r.scoreChangeApplied,false);
});
test('does not fabricate missing inputs or accept mismatched identities',()=>{
 const incomplete=inputs.map(r=>({...r}));delete incomplete[0].exhibitionScore;
 const r=compareMakulaboWithScores({verified:true,racers},incomplete,provenance);
 assert.equal(r.status,'insufficient_data');assert.equal(r.racers[0].score,null);
 assert.equal(compareMakulaboWithScores({verified:true,racers},inputs.map(r=>({...r,racerId:'9999'})),provenance).status,'racer_id_mismatch');
});

test('rejects historical comparisons without proven pre-race snapshots',()=>{
 const r=compareMakulaboWithScores({verified:true,racers},inputs);
 assert.equal(r.status,'pre_race_evidence_required');
 assert.equal(r.scoreChangeApplied,false);
});
