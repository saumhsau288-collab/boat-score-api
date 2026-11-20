import assert from 'node:assert/strict';
import {auditSavedResearchRace as audit} from './audit-saved-research-race.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:6,localWinRate:0,motorTwoWinRate:50,entryCourse:null,entryCourseVerified:false,
 exhibitionScore:null,exhibitionScoreVerified:false}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',
 date:'20261120',venue:2,race:1,racers};
const recent50=racers.map(r=>({racerId:r.racerId,winRate:20,verified:true}));
const out=audit(snapshot,recent50);
assert.equal(out.status,'research_morning_audited');
assert.equal(out.morning.status,'evaluated');
assert.equal(out.phaseComparison.comparableRows,0);
assert.equal(out.phaseComparison.rows[0].morningScore,54.21);
assert.equal(out.phaseComparison.rows[0].entryCourse,null);
assert.equal(out.eligibleForCalibration,false);
assert.equal(audit(snapshot,[]).status,'held');
assert.equal(audit({...snapshot,source:'unknown'},recent50).status,'held');
console.log('Saved research race audit tests passed');
