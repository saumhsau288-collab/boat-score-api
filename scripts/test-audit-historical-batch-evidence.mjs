import assert from 'node:assert/strict';
import {auditHistoricalBatch} from './audit-historical-batch-evidence.mjs';
const raceKey='20261120-18-1',deadlineEpochMs=Date.parse('2026-11-19T23:43:00Z');
const full={raceKey,deadlineEpochMs,prediction:{capturedBeforeDeadline:true,capturedAtEpochMs:deadlineEpochMs-60000,sourceVerified:true,tickets:[[1,3,2]]},racers:Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),officialMetricsVerified:true,metricsCapturedBeforeDeadline:true})),officialResult:{raceKey,sourceVerified:true,finishOrder:[1,3,2,4,5,6]}};
const ok=auditHistoricalBatch([full]);assert.equal(ok.eligibleCount,1);assert.equal(ok.heldCount,0);
const missing=auditHistoricalBatch([{...full,prediction:{...full.prediction,capturedBeforeDeadline:false}}]);assert.equal(missing.eligibleCount,0);assert.ok(missing.held[0].reasons.includes('prediction_timing_unverified'));
const dup=auditHistoricalBatch([full,full]);assert.equal(dup.eligibleCount,0);assert.equal(dup.heldCount,2);assert.ok(dup.held.every(x=>x.reasons.includes('duplicate_race_key')));
const retrospective=auditHistoricalBatch([{raceKey,deadlineEpochMs,racers:[],officialResult:{raceKey,sourceVerified:false}}]);assert.equal(retrospective.eligibleCount,0);assert.ok(retrospective.held[0].reasons.includes('six_verified_pre_race_racers_missing'));
console.log('Batch evidence gate: 4 scenarios passed');
