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

test('only records a verified exhibition time for the matching racer and boat',()=>{
 const x=buildResearchFeatureSnapshot({...base,exhibitionByBoat:[
  {boat:1,racerId:'4001',exhibitionTime:6.81,verified:true},
  {boat:2,racerId:'4001',exhibitionTime:6.70,verified:true},
  {boat:3,racerId:'4003',exhibitionTime:6.75,verified:false}
 ]});
 assert.equal(x.racers[0].exhibitionTime,6.81);
 assert.equal(x.racers[0].exhibitionTimeVerified,true);
 assert.equal(x.racers[1].exhibitionTime,null);
 assert.equal(x.racers[2].exhibitionTime,null);
 assert.equal(x.eligibleForCalibration,false);
});
test('duplicate exhibition boat records are rejected',()=>{
 const x=buildResearchFeatureSnapshot({...base,exhibitionByBoat:[
  {boat:1,racerId:'4001',exhibitionTime:6.8,verified:true},
  {boat:1,racerId:'4001',exhibitionTime:6.9,verified:true}
 ]});
 assert.equal(x.status,'invalid_exhibition_mapping');
 assert.equal(x.eligibleForCalibration,false);
});

test('start timing is accepted only for verified matching racer and boat',()=>{
 const x=buildResearchFeatureSnapshot({...base,startTimingByBoat:[
  {boat:1,racerId:'4001',startTiming:0.12,verified:true},
  {boat:2,racerId:'4001',startTiming:0.09,verified:true},
  {boat:3,racerId:'4003',startTiming:0,verified:false}
 ]});
 assert.equal(x.racers[0].startTiming,0.12);
 assert.equal(x.racers[0].startTimingVerified,true);
 assert.equal(x.racers[1].startTiming,null);
 assert.equal(x.racers[2].startTiming,null);
 assert.equal(x.eligibleForCalibration,false);
});
test('duplicate start timing boat records are rejected',()=>{
 const x=buildResearchFeatureSnapshot({...base,startTimingByBoat:[
  {boat:1,racerId:'4001',startTiming:0.12,verified:true},
  {boat:1,racerId:'4001',startTiming:0.13,verified:true}
 ]});
 assert.equal(x.status,'invalid_start_timing_mapping');
 assert.equal(x.eligibleForCalibration,false);
});

test('complete verified six-boat ST and exhibition clear only their missing flags',()=>{
 const startTimingByBoat=official.map(r=>({boat:r.boat,racerId:r.racerId,startTiming:0.1,verified:true}));
 const exhibitionByBoat=official.map(r=>({boat:r.boat,racerId:r.racerId,exhibitionTime:6.8,verified:true}));
 const x=buildResearchFeatureSnapshot({...base,startTimingByBoat,exhibitionByBoat});
 assert.equal(x.status,'captured_research_inputs');
 assert.ok(x.racers.every(r=>r.startTimingVerified&&r.exhibitionTimeVerified));
 assert.equal(x.missing.includes('start_timing'),false);
 assert.equal(x.missing.includes('exhibition'),false);
 assert.ok(x.missing.includes('pre_race_source_authentication'));
 assert.equal(x.eligibleForCalibration,false);
});
test('one unverified ST keeps the entire six-boat ST evidence incomplete',()=>{
 const startTimingByBoat=official.map(r=>({boat:r.boat,racerId:r.racerId,startTiming:0.1,verified:r.boat!==6}));
 const x=buildResearchFeatureSnapshot({...base,startTimingByBoat});
 assert.ok(x.missing.includes('start_timing'));
 assert.equal(x.racers[5].startTiming,null);
 assert.equal(x.eligibleForCalibration,false);
});

test('rejects two verified racers assigned the same entry course',()=>{
 const x=buildResearchFeatureSnapshot({...base,courseByBoat:[
  {boat:1,racerId:'4001',entryCourse:2,verified:true},
  {boat:2,racerId:'4002',entryCourse:2,verified:true}
 ]});
 assert.equal(x.status,'duplicate_verified_entry_course');
 assert.equal(x.eligibleForCalibration,false);
});
test('allows distinct verified entry courses even when boats swap positions',()=>{
 const x=buildResearchFeatureSnapshot({...base,courseByBoat:[
  {boat:1,racerId:'4001',entryCourse:2,verified:true},
  {boat:2,racerId:'4002',entryCourse:1,verified:true}
 ]});
 assert.equal(x.status,'captured_research_inputs');
 assert.equal(x.racers[0].entryCourse,2);
 assert.equal(x.racers[1].entryCourse,1);
 assert.equal(x.eligibleForCalibration,false);
});

test('course swap does not swap ST, exhibition, or racer-specific recent50 data',()=>{
 const x=buildResearchFeatureSnapshot({...base,
  courseByBoat:[
   {boat:1,racerId:'4001',entryCourse:2,verified:true},
   {boat:2,racerId:'4002',entryCourse:1,verified:true}
  ],
  startTimingByBoat:[
   {boat:1,racerId:'4001',startTiming:0.08,verified:true},
   {boat:2,racerId:'4002',startTiming:0.19,verified:true}
  ],
  exhibitionByBoat:[
   {boat:1,racerId:'4001',exhibitionTime:6.71,verified:true},
   {boat:2,racerId:'4002',exhibitionTime:6.89,verified:true}
  ],
  recent50:[
   {racerId:'4001',firstPlaceRate:42,verified:true},
   {racerId:'4002',firstPlaceRate:12,verified:true}
  ]
 });
 assert.equal(x.status,'captured_research_inputs');
 assert.deepEqual(
  x.racers.slice(0,2).map(r=>[r.racerId,r.entryCourse,r.startTiming,r.exhibitionTime,r.recent50FirstPlaceRate]),
  [['4001',2,0.08,6.71,42],['4002',1,0.19,6.89,12]]
 );
 assert.equal(x.eligibleForCalibration,false);
});

test('rejects impossible calendar dates and accepts leap day',()=>{
 const impossible=buildResearchFeatureSnapshot({...base,date:'20260230'});
 assert.equal(impossible.status,'invalid_capture_identity');
 assert.equal(impossible.eligibleForCalibration,false);
 const leap=buildResearchFeatureSnapshot({...base,date:'20240229'});
 assert.equal(leap.status,'captured_research_inputs');
 assert.equal(leap.eligibleForCalibration,false);
});
