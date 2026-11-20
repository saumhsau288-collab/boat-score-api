import assert from 'node:assert/strict';
import {summarizeResearchFinishGaps as summarize} from './summarize-research-finish-gaps.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:9-i,localWinRate:9-i,motorTwoWinRate:50}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',date:'20261120',venue:2,race:1,racers};
const recent50=racers.map(r=>({racerId:r.racerId,winRate:20,verified:true}));
const officialResult={date:'20261120',venue:2,race:1,verified:true,finishOrder:[6,2,3,4,5,1]};
const courseMapping=Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,verified:true}));
const item={snapshot,recent50,officialResult,courseMapping};
const out=summarize([item,item,{...item,courseMapping:[]}]);
assert.equal(out.status,'descriptive_batch_summary');
assert.equal(out.compared,1);
assert.equal(out.held,2);
assert.equal(out.underperformedCount,1);
assert.equal(out.outperformedCount,1);
assert.equal(out.eligibleForCalibration,false);
assert.equal(out.authenticatedHistoricalPredictions,0);
assert.equal(summarize(null).status,'held');
console.log('Research score-finish batch summary tests passed');
