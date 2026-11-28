import assert from 'node:assert/strict';
import {auditPairedComparisonFairness} from './audit-paired-comparison-fairness.mjs';
import {METHOD_IDS,METHOD_VERSION} from '../generate-twelve-independent-methods.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 entryCourse:i+1,nationalRate:6,localRate:0,averageST:.15,motor2Rate:40,
 exhibitionTime:6.8,last50CoursePodiumRate:50}));
const evidence={date:'20261123',venue:2,race:1,capturedAt:'2026-11-23T00:00:00Z',
 officialCutoffAt:'2026-11-23T01:00:00Z',cutoffSourceVerified:true,
 captureSourceVerified:true,modelVersion:METHOD_VERSION,featureSource:'official_live_entry',racers};
const methods=Object.fromEntries(METHOD_IDS.map(id=>[id,{status:'predicted',
 trifecta:[1,2,3],ruleVersion:METHOD_VERSION}]));
const row={evidence,newPrediction:{version:METHOD_VERSION,methods},
 oldPrediction:{savedBeforeCutoff:true,capturedAt:evidence.capturedAt,tickets:[[1,2,3]]},
 official:{date:'20261123',venue:2,race:1,verified:true,finishOrder:[1,2,3,4,5,6]}};
assert.equal(auditPairedComparisonFairness([row]).fairForRawHitRate,true);
const six={...row,oldPrediction:{...row.oldPrediction,
 tickets:[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]}};
assert.equal(auditPairedComparisonFairness([six]).fairForRawHitRate,false);
assert.deepEqual(auditPairedComparisonFairness([six]).oldTicketCounts,[6]);
const duplicate={...row,oldPrediction:{...row.oldPrediction,tickets:[[1,2,3],[1,2,3]]}};
assert.ok(auditPairedComparisonFairness([duplicate]).issues.some(x=>x.reason==='duplicate_old_tickets'));
assert.equal(auditPairedComparisonFairness([]).fairForRawHitRate,false);
console.log('Old/new equal-ticket fairness audit tests passed');
