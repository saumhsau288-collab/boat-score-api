import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileMakulaboHeatmap} from './boat-score-2-makulabo-heatmap-adapter.js';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'選手'+(i+1)}));
const heatmap=official.map(r=>({boat:r.boat,racerId:r.racerId,name:r.name,counts:[2,1,1,0,0,0],runs:4}));
test('matches six boats by racer ID and keeps counts unverified for recent50 scoring',()=>{
 const result=reconcileMakulaboHeatmap(official,[...heatmap].reverse());
 assert.equal(result.verified,true);
 assert.deepEqual(result.racers.map(r=>r.boat),[1,2,3,4,5,6]);
 assert.equal(result.racers[0].firstColumnShare,50);
 assert.equal(result.racers[0].firstPlaceRate,null);
 assert.equal(result.racers[0].courseFinishMatrixVerified,false);
 assert.equal(result.racers[0].eligibleForCourseSpecificScoring,false);
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

test('calculates overall 1st, top-2 and top-3 rates only with verified headers',()=>{
 const rows=heatmap.map(r=>({...r,finishHeadersVerified:true}));
 const result=reconcileMakulaboHeatmap(official,rows);
 assert.equal(result.verified,true);
 assert.equal(result.racers[0].firstPlaceRate,50);
 assert.equal(result.racers[0].top2Rate,75);
 assert.equal(result.racers[0].top3Rate,100);
 assert.equal(result.racers[0].eligibleForCourseSpecificScoring,false);
 assert.equal(result.racers[0].eligibleAsVerifiedRecent50,false);
});
test('unverified headers cannot create finish rates',()=>{
 const result=reconcileMakulaboHeatmap(official,heatmap);
 assert.equal(result.racers[0].top2Rate,null);
 assert.equal(result.racers[0].top3Rate,null);
});

test('rejects malformed source run totals',()=>{
 const rows=heatmap.map(r=>({...r}));
 rows[0].runs='4';
 assert.equal(reconcileMakulaboHeatmap(official,rows).reason,'run_count_conflict');
 rows[0].runs=4.5;
 assert.equal(reconcileMakulaboHeatmap(official,rows).reason,'run_count_conflict');
});
