import assert from 'node:assert/strict';
import {replayHistoricalRace as replay} from './replay-historical-race-with-current-scoring.mjs';
const featuresByBoat=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),
 nationalWinRate:8-i,localWinRate:8-i,motorTwoWinRate:60-i*5,recent50WinRate:50-i*5,exhibitionScore:80-i*5}));
const finishByBoat=featuresByBoat.map((f,i)=>({boat:f.boat,racerId:f.racerId,finish:i+1}));
const featureEvidence={historicalSourceVerified:true,resultIndependent:true,
 sources:[{url:'https://www.boatrace.jp/owpc/pc/race/racelist',sha256:'example-fixture',historicalValidityVerified:true}]};
const args={date:'20261120',venue:'18',race:1,featuresByBoat,finishByBoat,featureEvidence};
const ok=replay(args);
assert.equal(ok.status,'retrospective_replay');
assert.equal(ok.winnerCorrect,true);
assert.equal(ok.topThreePodiumHits,3);
assert.equal(ok.notAnArchivedPrediction,true);
assert.equal(ok.eligibleForDeployment,false);
assert.equal(replay({...args,featureEvidence:null}).reason,'historical_pre_result_features_not_authenticated');
assert.equal(replay({...args,featureEvidence:{...featureEvidence,resultIndependent:false}}).status,'held');
assert.equal(replay({...args,featuresByBoat:featuresByBoat.map((f,i)=>i===0?{...f,exhibitionScore:undefined}:f)}).reason,'required_historical_features_missing');
assert.equal(replay({...args,finishByBoat:finishByBoat.map((f,i)=>i===0?{...f,racerId:'4999'}:f)}).reason,'official_finish_identity_mismatch');
console.log('Historical current-scoring retrospective replay tests passed');
