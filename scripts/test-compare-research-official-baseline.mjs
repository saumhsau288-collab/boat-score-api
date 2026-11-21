import assert from 'node:assert/strict';
import {compareResearchOfficialBaseline as compare} from './compare-research-official-baseline.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),
 name:'Racer '+(i+1),sourceVerified:true,nationalWinRate:6,localWinRate:i===0?0:5,motorTwoWinRate:40}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',date:'20261121',venue:1,race:1,racers};
const finish={status:'descriptive_finish_comparison',racers:racers.map(r=>({boat:r.boat,runs:49,firstPlaceRate:10,top2Rate:30,top3Rate:50}))};
const x=compare(snapshot,finish);
assert.equal(x.status,'research_official_component_comparison');
assert.equal(x.rows.length,6);
assert.equal(x.rows[0].officialComponentScore85,48);
assert.equal(x.rows[0].localRateFallbackApplied,true);
assert.equal(x.rows[1].officialComponentScore85,45.5);
assert.equal(x.scoreChangeApplied,false);
assert.equal(x.eligibleForCalibration,false);
assert.equal(compare({...snapshot,racers:racers.slice(1)},finish).status,'held');
assert.equal(compare(snapshot,{...finish,racers:finish.racers.slice(1)}).status,'held');
assert.equal(compare(snapshot,{...finish,racers:finish.racers.map(r=>({...r,firstPlaceRate:90,top2Rate:30}))}).status,'held');
console.log('Research official-only baseline comparison tests passed');
