import assert from 'node:assert/strict';
import {evaluateCapturedResearchSnapshot as evaluate} from './evaluate-captured-research-snapshot.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:i===0?9:5,localWinRate:i===0?9:5,motorTwoWinRate:50}));
const snapshot={source:'verified_official_metrics',status:'captured_research_inputs',date:'20261120',venue:2,race:1,racers};
const recent50=racers.map(r=>({racerId:r.racerId,winRate:50,verified:true}));
assert.equal(evaluate(snapshot,recent50).status,'evaluated');
assert.equal(evaluate(snapshot,recent50).eligibleForCalibration,false);
assert.equal(evaluate(snapshot,recent50).predictionEngine,'research_morning_pipeline_not_deployed_worker');
assert.equal(evaluate({...snapshot,racers:racers.map(r=>({...r,sourceVerified:false}))},recent50).reason,'original_official_source_provenance_missing');
assert.equal(evaluate(snapshot,[]).reason,'six_verified_recent50_records_required');
assert.equal(evaluate({status:'unverified_official',racers:[]},recent50).status,'held');
assert.equal(evaluate(snapshot,recent50.map(x=>({...x,verified:false}))).status,'held');
console.log('Research snapshot-to-morning scoring bridge tests passed');
