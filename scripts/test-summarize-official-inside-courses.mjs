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
const invalid=summarizeOfficialInsideCourses({rows:[
 make(4,[1,1,2,3,5,6]), // duplicate winner: must not double-count podium
 make(5,[1,2,2,4,5,6]), // duplicate second place
 make(6,[1,2,3,4,5,6])
]});
assert.equal(invalid.total,3);
assert.equal(invalid.usable,1);
assert.equal(invalid.blocked,2);
assert.equal(invalid.insideWins,1);
assert.equal(invalid.insidePodiumPlacements,3);
console.log('Inner-course descriptive summary tests passed (synthetic only)');
