import assert from 'node:assert/strict';
import {diagnoseResearchScoreFinishGap as diagnose} from './diagnose-research-score-finish-gap.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:9-i,localWinRate:9-i,motorTwoWinRate:50}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',date:'20261120',venue:2,race:1,racers};
const recent50=racers.map(r=>({racerId:r.racerId,winRate:20,verified:true}));
const result={date:'20261120',venue:2,race:1,verified:true,finishOrder:[6,2,3,4,5,1]};
const courses=Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,verified:true}));
const out=diagnose(snapshot,recent50,result,courses);
assert.equal(out.status,'descriptive_gap_diagnosis');
assert.equal(out.groups.underperformed.length,1);
assert.equal(out.groups.underperformed[0].boat,1);
assert.equal(out.groups.outperformed.length,1);
assert.equal(out.groups.outperformed[0].boat,6);
assert.equal(out.rows.length,6);
assert.equal(out.eligibleForCalibration,false);
assert.equal(diagnose(snapshot,recent50,result,courses.slice(0,5)).status,'held');
console.log('Research score-versus-finish gap diagnosis tests passed');
