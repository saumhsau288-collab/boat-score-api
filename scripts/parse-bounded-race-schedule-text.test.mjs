import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBoundedRaceScheduleText as parse} from './parse-bounded-race-schedule-text.mjs';
const scheduleText='レース 1 2 3 4 5 6 7 8 9 10 11 12\n締切予定時刻 10:16 10:42 11:08 11:34 12:00 12:26 12:53 13:24 13:52 14:21 14:51 15:32';
test('Miyajima 2R selects 10:42, not 1R 10:16',()=>{
 const r=parse({scheduleText,expectedRace:2,sourceVerified:true});
 assert.deepEqual(r,{verified:true,cutoffJst:'10:42',reason:null});
});
test('Miyajima 6R selects 12:26',()=>{
 assert.equal(parse({scheduleText,expectedRace:6,sourceVerified:true}).cutoffJst,'12:26');
});
test('source not verified blocks promotion',()=>{
 assert.equal(parse({scheduleText,expectedRace:2,sourceVerified:false}).verified,false);
});
test('duplicate schedule rows are rejected',()=>{
 assert.equal(parse({scheduleText:scheduleText+'\n締切予定時刻 10:16',expectedRace:2,sourceVerified:true}).verified,false);
});
test('missing race column rejected',()=>{
 assert.equal(parse({scheduleText:scheduleText.replace('1 2 3','1 3'),expectedRace:2,sourceVerified:true}).verified,false);
});
