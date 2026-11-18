import assert from 'node:assert/strict';
import {classifyCaptureTiming} from './audit-morning-official-cutoffs.mjs';
const record={date:'20261118',venue:1,race:1,receivedAt:'2026-11-18T01:00:00Z'};
const verified={date:'20261118',venue:1,race:1,verified:true,source:'official',sourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist',cutoffAt:'2026-11-18T01:05:00Z'};
assert.equal(classifyCaptureTiming(record).status,'official_cutoff_unverified');
assert.equal(classifyCaptureTiming(record,{...verified,verified:false}).status,'official_cutoff_unverified');
assert.equal(classifyCaptureTiming(record,{...verified,source:'api_claim'}).status,'official_cutoff_unverified');
assert.equal(classifyCaptureTiming(record,{...verified,venue:2}).status,'official_cutoff_identity_mismatch');
for(const sourceUrl of [undefined,'https://boatrace.jp.evil.example/','https://example.com/','http://www.boatrace.jp/','https://boatrace.jp@evil.example/']) {
 assert.equal(classifyCaptureTiming(record,{...verified,sourceUrl}).status,'official_cutoff_unverified');
}
assert.equal(classifyCaptureTiming(record,verified).status,'captured_before_official_cutoff');
assert.equal(classifyCaptureTiming({...record,receivedAt:verified.cutoffAt},verified).status,'captured_at_or_after_official_cutoff');
assert.equal(classifyCaptureTiming({...record,receivedAt:'bad'},verified).status,'invalid_capture_time');
assert.equal(classifyCaptureTiming(record,verified).authenticatedBeforeRace,false);
console.log('Official cutoff timing audit tests passed');
