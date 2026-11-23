import assert from 'node:assert/strict';
import {reportIndependentMethodAccuracy} from './report-independent-method-accuracy.mjs';
import {METHOD_IDS,METHOD_VERSION} from '../generate-twelve-independent-methods.mjs';
const empty=reportIndependentMethodAccuracy([]);
assert.equal(empty.conclusion,'NOT_MEASURED');
assert.equal(empty.realWorldMeasured,false);
assert.equal(empty.methods.length,12);
assert.ok(empty.methods.every(x=>x.hitRatePercent===null));
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 entryCourse:i+1,nationalRate:6,localRate:0,averageST:.15,motor2Rate:40,
 exhibitionTime:6.8,last50CoursePodiumRate:50}));
const evidence={date:'20261123',venue:2,race:1,capturedAt:'2026-11-23T00:00:00Z',
 officialCutoffAt:'2026-11-23T01:00:00Z',cutoffSourceVerified:true,
 captureSourceVerified:true,modelVersion:METHOD_VERSION,featureSource:'official_live_entry',racers};
const methods=Object.fromEntries(METHOD_IDS.map(id=>[id,{status:'predicted',
 trifecta:[1,2,3],ruleVersion:METHOD_VERSION}]));
const fixture={evidence,prediction:{version:METHOD_VERSION,methods},
 official:{date:'20261123',venue:2,race:1,verified:true,finishOrder:[1,2,3,4,5,6]}};
const testOnly=reportIndependentMethodAccuracy([fixture],{dataKind:'fixture'});
assert.equal(testOnly.methods[0].hitRatePercent,100);
assert.equal(testOnly.realWorldMeasured,false);
assert.equal(testOnly.conclusion,'NOT_MEASURED');
assert.equal(testOnly.improvementVerified,false);
const held=reportIndependentMethodAccuracy([{...fixture,official:{...fixture.official,verified:false}}],
 {dataKind:'authenticated_real_races'});
assert.equal(held.heldRecords,1);
assert.equal(held.conclusion,'NOT_MEASURED');
console.log('12-method accuracy reports cannot confuse fixtures with measured improvement');
