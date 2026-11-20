import assert from 'node:assert/strict';
import {buildPriorRacerCourseRates} from './build-prior-racer-course-rates.mjs';
const make=(date,race)=>Array.from({length:6},(_,i)=>({date,venue:'18',race,racerId:String(4001+i),entryCourse:i+1,finish:i+1}));
const joined={status:'verified_racer_entry_course_finish_join',rows:[
 ...make('20261118',1),...make('20261118',2),...make('20261119',1)]};
const result=buildPriorRacerCourseRates(joined);
assert.equal(result.rows.length,18);
assert.equal(result.rows[0].priorRacerStarts,0);
assert.equal(result.rows[6].priorRacerStarts,0); // same-day races cannot leak
assert.equal(result.rows[12].priorRacerStarts,2);
assert.equal(result.rows[12].priorRacerWinRate,1);
assert.equal(result.rows[13].priorRacerWinRate,0);
assert.equal(result.rows[12].priorVenueCourseStarts,2);
assert.equal(result.eligibleForDeployment,false);
assert.throws(()=>buildPriorRacerCourseRates({status:'verified_racer_entry_course_finish_join',rows:[make('20261118',1)[0]]}),/incomplete/);
console.log('Chronological prior-only racer venue/course rates tests passed');
