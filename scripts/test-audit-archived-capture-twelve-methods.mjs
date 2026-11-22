import test from 'node:test';
import assert from 'node:assert/strict';
import {auditArchivedCaptureForTwelveMethods} from './audit-archived-capture-twelve-methods.mjs';
const response={ready:true,main:Array(6).fill([1,2,3]),upset:Array(6).fill([4,5,6]),rankedScores:Array.from({length:6},(_,i)=>({boat:i+1,score:50}))};
test('old ranked scores and twelve tickets are not mistaken for six-racer inputs',()=>{
 const out=auditArchivedCaptureForTwelveMethods({authenticatedBeforeRace:false,records:[{httpStatus:200,response}]});
 assert.equal(out.readyOldRankedPredictions,1);
 assert.equal(out.completeSixBoatFeatureVectors,0);
 assert.equal(out.omittedWithoutSixBoatInputs,1);
 assert.equal(out.authenticatedBeforeRace,false);
});
test('complete six-racer source features are audited without asserting authentication',()=>{
 const inputs=Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,
 nationalWinRate:7-i*.5,localWinRate:0,averageStartTiming:.13+i*.01,
 motorTwoRate:30+i*5,exhibitionTime:6.8-i*.03,last50CoursePodiumRate:20+i*10}));
 const out=auditArchivedCaptureForTwelveMethods({records:[{httpStatus:200,response:{...response,scoreInputsByBoat:inputs}}]});
 assert.equal(out.completeSixBoatFeatureVectors,1);
 assert.equal(out.fieldCoverageAmongReady.nationalWinRate,1);
 assert.equal(out.methodReadiness['favorite-1'].ready,1);
 assert.equal(out.authenticatedBeforeRace,false);
});
