import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileMakulaboHeatmap} from './boat-score-2-makulabo-heatmap-adapter.js';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'選手'+(i+1)}));
const heatmap=official.map(r=>({boat:r.boat,racerId:r.racerId,name:r.name,counts:[2,1,1,0,0,0],runs:4}));
test('matches six boats by racer ID and keeps counts unverified for recent50 scoring',()=>{
 const result=reconcileMakulaboHeatmap(official,[...heatmap].reverse());
 assert.equal(result.verified,true);
 assert.deepEqual(result.racers.map(r=>r.boat),[1,2,3,4,5,6]);
 assert.equal(result.racers[0].firstPlaceRate,50);
 assert.equal(result.racers[0].eligibleAsVerifiedRecent50,false);
});
test('rejects boat conflict',()=>{
 const rows=heatmap.map(r=>({...r}));
 rows[0].boat=6;
 assert.equal(reconcileMakulaboHeatmap(official,rows).reason,'boat_conflict');
});
test('rejects incorrect run count',()=>{
 const rows=heatmap.map(r=>({...r}));
 rows[0].runs=50;
 assert.equal(reconcileMakulaboHeatmap(official,rows).reason,'run_count_conflict');
});
test('rejects missing counts and missing racers',()=>{
 assert.equal(reconcileMakulaboHeatmap(official,heatmap.slice(1)).verified,false);
 const rows=heatmap.map(r=>({...r}));
 rows[0].counts=null;
 assert.equal(reconcileMakulaboHeatmap(official,rows).reason,'invalid_heatmap_counts');
});
