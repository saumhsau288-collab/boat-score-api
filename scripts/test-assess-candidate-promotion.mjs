import test from 'node:test';import assert from 'node:assert/strict';
import {assessCandidatePromotion} from './assess-candidate-promotion.mjs';
const day=(a,b)=>({frameOnly:{races:100,exact:a},secondFrameBoost:{races:100,exact:b}});
test('blocks deployment from three-day archive even with better total',()=>{
 const r=assessCandidatePromotion({daily:[day(10,12),day(10,8),day(7,11)]});
 assert.equal(r.promote,false);assert.equal(r.candidateExact,31);assert.equal(r.baselineExact,27);
 assert.equal(r.positiveDays,2);assert.equal(r.negativeDays,1);
});
test('requires prospective and pre-race verification even with good daily metrics',()=>{
 const daily=Array.from({length:8},()=>day(7,10));
 assert.equal(assessCandidatePromotion({daily}).promote,false);
 assert.equal(assessCandidatePromotion({daily,preRaceSnapshotsVerified:true,prospectivelyHeldOut:true}).promote,true);
});
