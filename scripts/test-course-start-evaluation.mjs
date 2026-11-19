import assert from 'node:assert/strict';
import {compareCourseAndStart} from './course-start-evaluation.mjs';
const rows=Array.from({length:6},(_,i)=>({date:'20261118',venue:1,race:1,course:i+1,finish:i+1,st:0.12+i*0.01,verified:true}));
const r=compareCourseAndStart(rows);
assert.equal(r.eligibleRaces,1);assert.equal(r.innerWins,1);assert.equal(r.fastestStartWins,1);assert.equal(r.innerTop3Rate,1);
assert.equal(compareCourseAndStart(rows.slice(0,5)).eligibleRaces,0);
console.log('Course and start diagnostics checks passed (synthetic only)');
