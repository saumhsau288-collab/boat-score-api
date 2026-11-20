import assert from 'node:assert/strict';
import {auditSavedResearchBatchWithSourceEvidence as audit} from './audit-saved-research-batch-source-evidence.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:9-i,localWinRate:9-i,motorTwoWinRate:50}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',date:'20261120',venue:2,race:1,racers};
const recent50=racers.map(r=>({racerId:r.racerId,winRate:20,verified:true,
 sourceUrl:'https://example.org/record',observedAt:'2026-11-20T00:00:00Z'}));
const officialResult={date:'20261120',venue:2,race:1,verified:true,finishOrder:[6,2,3,4,5,1]};
const courseMapping=racers.map(r=>({boat:r.boat,entryCourse:r.boat,verified:true}));
const item={snapshot,recent50,officialResult,courseMapping};
const out=audit([item]);
assert.equal(out.sourceEvidenceReviewPassed,1);
assert.equal(out.compared,1);
assert.equal(out.eligibleForCalibration,false);
const held=audit([{...item,recent50:recent50.map(r=>({...r,sourceUrl:undefined}))}]);
assert.equal(held.sourceEvidenceReviewHeld,1);
assert.equal(held.compared,0);
assert.equal(audit(null).status,'held');
console.log('Research batch recent50 source-evidence gate tests passed');
