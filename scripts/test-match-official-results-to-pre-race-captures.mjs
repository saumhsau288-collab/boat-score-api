import test from 'node:test';
import assert from 'node:assert/strict';
import {matchOfficialResultsToCaptures} from './match-official-results-to-pre-race-captures.mjs';
const result={date:'20261120',venue:17,race:1};
test('matches only identical date venue and race without granting calibration',()=>{
 const out=matchOfficialResultsToCaptures({results:[result]}, {records:[
  {...result,response:{scoreInputsByBoat:Array.from({length:6},(_,i)=>({boat:i+1}))}},
  {...result,race:2,response:{scoreInputsByBoat:[]}}
 ]});
 assert.equal(out.withMatchingCapture,1);
 assert.equal(out.withSixBoatCapture,1);
 assert.equal(out.eligibleForCalibration,0);
 assert.equal(out.rows[0].independentlyVerifiedPreRace,false);
});
test('missing capture remains unmatched and unverified',()=>{
 const out=matchOfficialResultsToCaptures({results:[result]},{records:[]});
 assert.equal(out.withMatchingCapture,0);
 assert.equal(out.eligibleForCalibration,0);
});
test('duplicate boat numbers cannot count as six-boat capture',()=>{
 const out=matchOfficialResultsToCaptures({results:[result]}, {records:[{...result,response:{scoreInputsByBoat:Array(6).fill({boat:1})}}]});
 assert.equal(out.withMatchingCapture,1);
 assert.equal(out.withSixBoatCapture,0);
});

test('six boat IDs without numeric scoring inputs are not complete features',()=>{
 const out=matchOfficialResultsToCaptures({results:[result]},{records:[{...result,response:{scoreInputsByBoat:Array.from({length:6},(_,i)=>({boat:i+1}))}}]});
 assert.equal(out.withSixBoatCapture,1);
 assert.equal(out.withCompleteFeatureCapture,0);
});
test('only fully bounded numeric scoring inputs count as complete',()=>{
 const boats=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6,localWinRate:0,motorTwoWinRate:45,recent50WinRate:35,exhibitionScore:70}));
 const out=matchOfficialResultsToCaptures({results:[result]},{records:[{...result,response:{scoreInputsByBoat:boats}}]});
 assert.equal(out.withCompleteFeatureCapture,1);
 assert.equal(out.eligibleForCalibration,0);
 boats[0].motorTwoWinRate=Infinity;
 assert.equal(matchOfficialResultsToCaptures({results:[result]},{records:[{...result,response:{scoreInputsByBoat:boats}}]}).withCompleteFeatureCapture,0);
});
