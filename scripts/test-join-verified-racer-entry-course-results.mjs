import assert from 'node:assert/strict';
import {buildVerifiedRacerCourseResults,summarizeRacerCoursePerformance} from './join-verified-racer-entry-course-results.mjs';
const unverified={expected:{date:'20261120',venue:'18',race:1}};
const held=buildVerifiedRacerCourseResults([unverified]);
assert.equal(held.races,0);
assert.equal(held.rows.length,0);
assert.equal(summarizeRacerCoursePerformance(held).groups.length,0);
assert.throws(()=>summarizeRacerCoursePerformance({rows:[]}),/verified_join_required/);
console.log('Verified racer actual-entry-course join gate tests passed');
