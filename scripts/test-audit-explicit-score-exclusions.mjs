import assert from 'node:assert/strict';
import {auditExplicitScoreExclusions} from './audit-explicit-score-exclusions.mjs';
const note='Course is observed but not scored; wind and last50 are excluded.';
const r=auditExplicitScoreExclusions({date:'20261118',records:[
{venue:1,race:1,httpStatus:200,response:{ready:true,missingInputs:['last50','course','weather'],note}},
{venue:1,race:2,httpStatus:200,response:{ready:true,missingInputs:['last50'],note:'Scoring unknown'}},
{venue:1,race:3,httpStatus:200,response:{ready:false,note}},
{venue:1,race:4,httpStatus:200,response:{ready:true,missingInputs:['weather']}}
]});
assert.equal(r.ready,3);
assert.equal(r.allThreeExplicitlyExcluded,1);
assert.deepEqual(r.missingInputs,{last50:2,course:1,weather:2});
assert.deepEqual(r.explicitExclusions,{last50:1,course:1,weather:1});
assert.equal(r.readyWithoutNote,1);
console.log('Explicit score exclusion audit tests passed');
