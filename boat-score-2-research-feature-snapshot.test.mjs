import test from 'node:test';
import assert from 'node:assert/strict';
import {buildResearchFeatureSnapshot} from './boat-score-2-research-feature-snapshot.js';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'Racer '+i,sourceVerified:true,nationalWinRate:6,localWinRate:0,motorTwoWinRate:40}));
const base={date:'20261120',venue:2,race:9,capturedAt:'2026-11-19T23:00:00Z',official};
test('retains racer identity and never infers course from boat',()=>{
 const x=buildResearchFeatureSnapshot(base);
 assert.equal(x.status,'captured_research_inputs');assert.equal(x.racers.length,6);
 assert.equal(x.racers[0].entryCourse,null);assert.equal(x.eligibleForCalibration,false);
});
test('only uses independently supplied verified course and recent50 mapping',()=>{
 const x=buildResearchFeatureSnapshot({...base,courseByBoat:[{boat:1,racerId:'4001',entryCourse:3,verified:true}],recent50:[{racerId:'4001',firstPlaceRate:22,verified:true}]});
 assert.equal(x.racers[0].entryCourse,3);assert.equal(x.racers[0].recent50FirstPlaceRate,22);
 assert.equal(x.racers[1].entryCourse,null);assert.equal(x.eligibleForCalibration,false);
});
test('rejects unverified official source',()=>assert.equal(buildResearchFeatureSnapshot({...base,official:official.map(x=>({...x,sourceVerified:false}))}).status,'unverified_official'));

test('rejects duplicate course mappings instead of silently overwriting a boat',()=>{
 const x=buildResearchFeatureSnapshot({...base,courseByBoat:[
  {boat:1,racerId:'4001',entryCourse:1,verified:true},
  {boat:1,racerId:'4001',entryCourse:2,verified:true}
 ]});
 assert.equal(x.status,'invalid_course_mapping');
 assert.equal(x.eligibleForCalibration,false);
});
test('does not transfer another racer recent50 data onto a boat',()=>{
 const x=buildResearchFeatureSnapshot({...base,recent50:[
  {racerId:'9999',firstPlaceRate:80,verified:true}
 ]});
 assert.equal(x.racers[0].recent50FirstPlaceRate,null);
 assert.equal(x.racers[0].recent50Verified,false);
 assert.equal(x.eligibleForCalibration,false);
});
