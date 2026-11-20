import assert from 'node:assert/strict';
import {summarizeVerifiedScoreFinishJoins as summarize} from './summarize-verified-score-finish-joins.mjs';
const expected={date:'20261120',venue:'02',race:3};
const cutoffTimes=['08:43','09:09','09:35','10:01','10:28','10:58','11:30','12:03','12:38','13:11','13:46','14:23'];
const source={...expected,officialDomainVerified:true,sourceDocumentVerified:true,raceIdentityVerified:true,
 cutoffLabelVerified:true,sourceCaptureVerified:true,sourceCapturedAtEpochMs:Date.parse('2026-11-20T08:00:00+09:00'),
 receivedAt:'2026-11-20T08:00:00+09:00',cutoffJst:'09:35',resultVerified:true};
const schedule={raceNumbers:Array.from({length:12},(_,i)=>i+1),cutoffTimes,sourceVerified:true};
const scoreInputsByBoat=Array.from({length:6},(_,i)=>({boat:i+1,verified:true,score:60-i*3,
 racerId:String(4001+i),preRaceSourceVerified:true,capturedAt:'2026-11-20T08:00:00+09:00',
 scoreComputedBeforeCutoffVerified:true,scoreComputedAt:'2026-11-20T08:05:00+09:00'}));
const finishByBoat=[3,1,5,2,4,6].map((boat,i)=>({boat,finish:i+1,officialResultVerified:true})).sort((a,b)=>a.boat-b.boat);
const good={expected,source,schedule,scoreInputsByBoat,finishByBoat};
assert.deepEqual(summarize([]).races,[]);
const out=summarize([good,{...good,source:{...source,resultVerified:false}}]);
assert.equal(out.eligible,1);
assert.equal(out.uniqueTopScoreRaceCount,1);
assert.equal(out.tiedTopScoreRaceCount,0);
assert.equal(out.descriptiveTopScoreFirstCount,0);
assert.equal(out.excludedReasons['official_result_unverified'],1);
assert.equal(out.excluded,1);
assert.equal(out.races[0].topScoreBoat,1);
assert.equal(out.races[0].actualFirstBoat,3);
assert.equal(out.races[0].topScoreFinishedFirst,false);
assert.deepEqual(out.races[0].actualPodiumScoreRanks,[3,1,5]);
assert.equal(out.eligibleForWeightTuning,false);
const duplicated=summarize([good,good]);
assert.equal(duplicated.total,2);
assert.equal(duplicated.eligible,1);
assert.equal(duplicated.excluded,1);
assert.equal(duplicated.excludedReasons.duplicate_race_identity,1);
const tied=summarize([{...good,scoreInputsByBoat:scoreInputsByBoat.map((v,i)=>i===1?{...v,score:60}:v)}]);
assert.equal(tied.eligible,1);
assert.equal(tied.uniqueTopScoreRaceCount,0);
assert.equal(tied.tiedTopScoreRaceCount,1);
assert.equal(tied.races[0].topScoreBoat,null);
assert.equal(tied.races[0].topScoreFinishedFirst,null);
assert.equal(tied.descriptiveTopScoreFirstCount,0);
assert.equal(summarize([{...good,scoreInputsByBoat:scoreInputsByBoat.map((v,i)=>i===0?{...v,scoreComputedAt:'2026-11-20T10:00:00+09:00'}:v)}]).eligible,0);
console.log('Verified score-finish descriptive report synthetic tests passed');
