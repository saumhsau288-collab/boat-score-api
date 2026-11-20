import assert from 'node:assert/strict';
import {compareHypotheticalAdjustments} from './compare-hypothetical-st-course-adjustments.mjs';
const baseScores=[54,24,53,23,22,34].map((score,i)=>({boat:i+1,score}));
const result=compareHypotheticalAdjustments({baseScores,
 averageSTByBoat:[.17,.16,.15,.18,null,.12],courseByBoat:[1,2,3,4,5,6]});
assert.equal(result.status,'retrospective_or_incomplete_scenario_only');
assert.deepEqual(result.missingSTBoats,[5]);
assert.equal(result.scoreChangeApplied,false);
assert.deepEqual(result.scenarios[0].order,[1,3,6,2,4,5]);
assert.equal(result.scenarios.length,5);
assert.ok(result.scenarios.every(x=>x.scored.find(r=>r.boat===5).stMissing));
assert.equal(compareHypotheticalAdjustments({baseScores,averageSTByBoat:[.1],courseByBoat:[1,2,3,4,5,6]}).status,'missing_start_evidence');
console.log(JSON.stringify({status:result.status,missingSTBoats:result.missingSTBoats,
 orders:Object.fromEntries(result.scenarios.map(s=>[s.name,s.order]))},null,2));
