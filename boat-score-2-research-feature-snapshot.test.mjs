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

test('retains official metrics per racer even when source rows are unordered',()=>{
 const x=buildResearchFeatureSnapshot({...base,official:official.map((r,i)=>({
  ...r,nationalWinRate:5+i/10,motorTwoWinRate:30+i
 })).reverse()});
 assert.equal(x.status,'captured_research_inputs');
 assert.deepEqual(x.racers.map(r=>r.boat),[1,2,3,4,5,6]);
 assert.equal(x.racers[0].racerId,'4001');
 assert.equal(x.racers[0].nationalWinRate,5);
 assert.equal(x.racers[5].motorTwoWinRate,35);
 assert.equal(x.eligibleForCalibration,false);
});
test('rejects duplicate official racer identities',()=>{
 const duplicated=official.map(x=>({...x}));
 duplicated[1].racerId=duplicated[0].racerId;
 const x=buildResearchFeatureSnapshot({...base,official:duplicated});
 assert.equal(x.status,'unverified_official');
 assert.equal(x.reason,'duplicate_boat_or_racer');
 assert.equal(x.eligibleForCalibration,false);
});

test('does not fabricate start timing or exhibition values when no source is supplied',()=>{
 const x=buildResearchFeatureSnapshot(base);
 assert.equal(x.status,'captured_research_inputs');
 assert.ok(x.racers.every(r=>r.startTiming===null&&r.exhibitionTime===null&&r.weather===null));
 assert.ok(x.missing.includes('start_timing'));
 assert.ok(x.missing.includes('exhibition'));
 assert.ok(x.missing.includes('weather'));
 assert.equal(x.eligibleForCalibration,false);
});
test('unverified recent50 figures do not become zero-valued evidence',()=>{
 const x=buildResearchFeatureSnapshot({...base,recent50:[
  {racerId:'4001',firstPlaceRate:0,verified:false}
 ]});
 assert.equal(x.racers[0].recent50FirstPlaceRate,null);
 assert.equal(x.racers[0].recent50Verified,false);
 assert.equal(x.eligibleForCalibration,false);
});
