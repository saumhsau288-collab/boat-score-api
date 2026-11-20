import assert from 'node:assert/strict';
import {auditExtraSixCutoffEvidence} from './audit-extra-six-cutoff-evidence.mjs';
const row={date:'20261121',venue:'18',race:8,
 cutoffAt:'2026-11-21T14:00:00+09:00',
 basePredictedAt:'2026-11-21T08:00:00+09:00',
 weatherPredictedAt:'2026-11-21T13:45:00+09:00',
 weatherObservedAt:'2026-11-21T13:30:00+09:00',
 lastPriorRaceResultAt:'2026-11-21T13:10:00+09:00',
 priorRaceNumbers:[1,2,3,4,5,6,7],
 priorRaceResultReceipts:[1,2,3,4,5,6,7].map(race=>({race,verified:true,resultCapturedAt:'2026-11-21T13:00:00+09:00'})),
 weatherEvidenceVerified:true,priorRacesOnlyVerified:true};
assert.equal(auditExtraSixCutoffEvidence([row]).accepted.length,1);
assert.equal(auditExtraSixCutoffEvidence([{...row,weatherObservedAt:'2026-11-21T13:50:00+09:00'}]).accepted.length,0);
assert.equal(auditExtraSixCutoffEvidence([{...row,lastPriorRaceResultAt:'2026-11-21T13:46:00+09:00'}]).accepted.length,0);
assert.equal(auditExtraSixCutoffEvidence([{...row,priorRaceNumbers:[1,2,8]}]).accepted.length,0);
assert.equal(auditExtraSixCutoffEvidence([{...row,weatherPredictedAt:'2026-11-22T13:45:00+09:00'}]).accepted.length,0);
assert.equal(auditExtraSixCutoffEvidence([{...row,priorRaceResultReceipts:row.priorRaceResultReceipts.map((x,i)=>i===3?{...x,resultCapturedAt:'2026-11-21T13:50:00+09:00'}:x)}]).accepted.length,0);
assert.equal(auditExtraSixCutoffEvidence([{...row,priorRaceResultReceipts:row.priorRaceResultReceipts.slice(1)}]).accepted.length,0);
console.log('Extra six forecast cutoff and per-race receipt tests passed');
