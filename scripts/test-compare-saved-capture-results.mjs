import assert from 'node:assert/strict';
import {compareSavedCaptureWithVerifiedResults as compare} from './compare-saved-capture-results.mjs';
const picks=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const capture={authenticatedBeforeRace:true,records:[{date:'20261118',venue:1,race:1,httpStatus:200,receivedAt:'2026-11-18T00:00:00Z',response:{ready:true,main:picks,upset:picks}}]};
const result={date:'20261118',venue:1,race:1,verified:true,finishOrder:[1,2,3,4,5,6],sourceUrl:'https://www.boatrace.jp/result',officialCutoffAt:'2026-11-18T00:30:00Z'};
const eligible=compare(capture,[result]);
assert.equal(eligible.compared,1);assert.equal(eligible.mainHits,1);
const unauthenticated=compare({...capture,authenticatedBeforeRace:false},[result]);
assert.equal(unauthenticated.compared,0);
assert.equal(unauthenticated.holdReasons.capture_not_authenticated_before_race,1);
for(const invalid of [undefined,null,'true',1]){
 const sample={...capture,authenticatedBeforeRace:invalid};
 const report=compare(sample,[result]);
 assert.equal(report.compared,0,'Unauthenticated or non-boolean marker must not qualify');
 assert.equal(report.mainHitRate,null);
 assert.equal(report.holdReasons.capture_not_authenticated_before_race,1);
}
assert.equal(compare(capture,[]).compared,0);
assert.equal(compare(capture,[{...result,officialCutoffAt:undefined}]).compared,0);
assert.equal(compare(capture,[{...result,officialCutoffAt:'2026-11-17T23:59:00Z'}]).compared,0);
assert.equal(compare(capture,[{...result,verified:false}]).compared,0);
assert.equal(compare(capture,[result,result]).compared,0);
assert.equal(compare(capture,[{...result,sourceUrl:undefined}]).compared,0);
const duplicated=compare({...capture,records:[capture.records[0],{...capture.records[0]}]},[result]);
assert.equal(duplicated.compared,0);
assert.equal(duplicated.held,2);
assert.equal(duplicated.mainHitRate,null);
assert.equal(duplicated.holdReasons.duplicate_saved_capture_race,2);
for(const spoofed of ['https://boatrace.jp.evil.example/result','https://example.com/result','http://www.boatrace.jp/result','https://boatrace.jp@evil.example/result']) {
 const report=compare(capture,[{...result,sourceUrl:spoofed}]);
 assert.equal(report.compared,0,'Spoofed or non-official origin must be held');
 assert.equal(report.holdReasons.missing_official_result_source,1);
}
assert.equal(compare(capture,[{...result,sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult'}]).compared,1);
const normalizedDuplicate=compare({...capture,records:[capture.records[0],{...capture.records[0],venue:'01',race:'01'}]},[result]);
assert.equal(normalizedDuplicate.compared,0);
assert.equal(normalizedDuplicate.holdReasons.duplicate_saved_capture_race,2);
const invalidKey=compare({...capture,records:[{...capture.records[0],venue:25}]},[result]);
assert.equal(invalidKey.compared,0);
assert.equal(invalidKey.holdReasons.invalid_saved_capture_race_key,1);
const normalizedOfficial=compare(capture,[{...result,venue:'01',race:'01'}]);
assert.equal(normalizedOfficial.compared,1);
for(const badTime of ['2026-11-18T00:00:00','2026-11-18 00:00:00','2026-11-18T00:00:00+99:00',null]){
 const badCapture=compare({...capture,records:[{...capture.records[0],receivedAt:badTime}]},[result]);
 assert.equal(badCapture.compared,0,'Ambiguous capture timestamp must be held');
 const badCutoff=compare(capture,[{...result,officialCutoffAt:badTime}]);
 assert.equal(badCutoff.compared,0,'Ambiguous official cutoff timestamp must be held');
}
assert.equal(compare({...capture,records:[{...capture.records[0],receivedAt:'2026-11-18T09:00:00+09:00'}]},[result]).compared,1);
console.log('Saved capture / official result comparison eligibility tests passed');
