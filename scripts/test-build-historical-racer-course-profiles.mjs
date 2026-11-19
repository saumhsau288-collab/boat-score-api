import assert from 'node:assert/strict';
import {buildHistoricalRacerCourseProfiles as build} from './build-historical-racer-course-profiles.mjs';
const row=(date,race,finish,course=4)=>({date,venue:1,race,racerId:'1234',course,finish,historicalRecordVerified:true,sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult'});
const report=build([row('20261101',1,1),row('20261102',1,2),row('20261103',1,3),
 row('20261118',1,1),row('20261101',1,1),row('20261104',1,4,5),
 {...row('20261105',1,1),historicalRecordVerified:false}],
 {asOfDate:'20261118',minStarts:2});
assert.equal(report.rejected.notEarlier,1);
assert.equal(report.rejected.duplicate,2);
assert.equal(report.rejected.invalid,1);
const four=report.profiles.find(p=>p.course===4);
assert.equal(four.starts,2);
assert.equal(four.firsts,0);
assert.equal(four.top3,2);
assert.equal(four.firstRate,0);
assert.equal(four.top3Rate,1);
assert.equal(four.enoughSamples,true);
assert.equal(report.profiles.find(p=>p.course===5).enoughSamples,false);
assert.equal(report.eligibleForScoreChange,false);
assert.equal(report.eligibleForReturnClaim,false);
assert.throws(()=>build([],{asOfDate:'20260230'}));
console.log('Historical course profiles as-of tests passed');
