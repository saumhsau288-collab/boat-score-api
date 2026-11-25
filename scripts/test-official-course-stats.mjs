import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchOfficialCourseStats} from '../match-official-course-stats.mjs';
const actual=JSON.parse(fs.readFileSync(new URL('../research/course-stats/2027-1.json',import.meta.url),'utf8'));
assert.equal(actual.racerCount,1658);
assert.equal(Object.keys(actual.racers).length,actual.racerCount);
assert.equal(actual.periodStart,'2026-05-01');
assert.equal(actual.periodEnd,'2026-10-31');
assert.equal(actual.sourceTextSha256,'16bb743708718227014b697851a21807255d3af31c8a8fdd06dccf69b1bb49bc');
const actualRows=Object.values(actual.racers).flat();
assert.equal(actualRows.length,9948);
assert.equal(actualRows.filter(x=>x.status==='available').length,9369);
assert.equal(actualRows.filter(x=>x.status==='no_normal_finish').length,579);
assert.equal(actualRows.filter(x=>x.status==='count_mismatch').length,0);
const racers=Object.keys(actual.racers).slice(0,6).map((racerId,i)=>({boat:i+1,racerId}));
const official={verified:true,statsVerified:true,racers,statsByBoat:racers.map(x=>({...x}))};
const fixed=matchOfficialCourseStats(actual,'20261126',official,null);
assert.equal(fixed.ready,true);
assert.equal(fixed.courseBasis,'assumed_frame_not_verified_course');
assert.equal(fixed.rows.length,6);
const start={verified:true,rows:racers.map(x=>({boat:x.boat,course:7-x.boat}))};
const shifted=matchOfficialCourseStats(actual,'20261126',official,start);
assert.equal(shifted.courseBasis,'verified_exhibition_course');
for(const row of shifted.rows){
 const expected=actual.racers[row.racerId].find(x=>x.course===row.course);
 assert.equal(row.course,7-row.boat);
 assert.deepEqual(row.finishCounts,expected.finishCounts);
 assert.equal(row.normalFinishes,expected.normalFinishes);
 if(row.rates)assert.ok(row.rates.every((rate,i)=>Math.abs(rate-expected.normalFinishRates123[i])<=.000051));
 else assert.equal(expected.normalFinishes,0);
}
assert.equal(matchOfficialCourseStats(actual,'20261031',official,start).ready,false);
assert.equal(matchOfficialCourseStats(actual,'20261126',{...official,statsVerified:false},start).ready,false);
assert.equal(matchOfficialCourseStats(actual,'20261126',{...official,statsByBoat:official.statsByBoat.map((x,i)=>i===0?{...x,racerId:'9999'}:x)},start).ready,false);
assert.equal(matchOfficialCourseStats(actual,'20261126',official,{verified:true,rows:start.rows.map(x=>({...x,course:1}))}).courseBasis,'assumed_frame_not_verified_course');
const missing={...actual,racers:{...actual.racers}};delete missing.racers[racers[0].racerId];
assert.equal(matchOfficialCourseStats(missing,'20261126',official,start).rows[0].status,'racer_or_course_missing');
const corrupt={...actual,racers:{...actual.racers,[racers[0].racerId]:actual.racers[racers[0].racerId].map(x=>x.course===6?{...x,normalFinishes:-1}:x)}};
assert.equal(matchOfficialCourseStats(corrupt,'20261126',official,start).rows[0].status,'count_mismatch');
console.log('Official course statistics: actual dataset coverage, exact registration match, exhibition course, missing samples and invalid identity guards passed.');

for(const row of shifted.rows){
 assert.equal(row.priorStrength,20);
 assert.ok(row.pooledRates.every(x=>x>0&&x<=1));
 assert.ok(row.smoothedRates.every((x,i)=>Math.abs(x-(row.finishCounts[i]+20*row.pooledRates[i])/(row.normalFinishes+20))<1e-10));
}
console.log('Official position rates: pooled same-course priors and 20-race smoothing passed.');
