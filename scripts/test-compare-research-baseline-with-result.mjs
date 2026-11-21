import assert from 'node:assert/strict';
import {compareResearchBaselineWithResult as compare} from './compare-research-baseline-with-result.mjs';
const baseline={status:'research_official_component_comparison',date:'20261121',venue:1,race:1,scoreChangeApplied:false,
 rows:Array.from({length:6},(_,i)=>({boat:i+1,officialComponentScore85:60-i*5}))};
const result={verified:true,date:'20261121',venue:1,race:1,finishOrder:[2,1,3,4,5,6]};
const x=compare(baseline,result);
assert.equal(x.status,'retrospective_comparison');
assert.equal(x.topComponentBoat,1);
assert.equal(x.actualWinnerBoat,2);
assert.equal(x.topComponentBoatWon,false);
assert.equal(x.topComponentBoatPodium,true);
assert.equal(x.eligibleForCalibration,false);
assert.equal(compare(baseline,{...result,verified:false}).status,'held');
assert.equal(compare(baseline,{...result,race:2}).status,'held');
assert.equal(compare(baseline,{...result,finishOrder:[1,1,3,4,5,6]}).status,'held');
assert.equal(compare({...baseline,rows:baseline.rows.slice(1)},result).status,'held');
console.log('Research baseline vs independently verified result tests passed');
