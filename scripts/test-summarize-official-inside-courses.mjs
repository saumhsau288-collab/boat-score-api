import assert from 'node:assert/strict';
import {summarizeOfficialInsideCourses} from './summarize-official-inside-courses.mjs';
const make=(race,finishes)=>({date:'20261118',venue:2,race,status:'parsed_needs_independent_review',racers:finishes.map((finish,i)=>({boat:i+1,actualEntryCourse:i+1,finish}))});
const d=summarizeOfficialInsideCourses({rows:[
 make(2,[null,4,1,3,null,2]),
 make(3,[2,3,1,5,6,4]),
 {status:'finish_table_not_found',racers:[]}
]});
assert.equal(d.total,3);
assert.equal(d.usable,2);
assert.equal(d.blocked,1);
assert.equal(d.insideWins,2);
assert.equal(d.insidePodiumPlacements,4);
assert.equal(d.insidePodiumSlots,6);
assert.deepEqual(d.insideWinsByCourse,{'1':0,'2':0,'3':2});
assert.deepEqual(d.podiumByCourse,{'1':1,'2':1,'3':2,'4':1,'5':0,'6':1});
assert.equal(d.eligibleForWeightTuning,false);
console.log('Inner-course descriptive summary tests passed (synthetic only)');
