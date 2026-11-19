import assert from 'node:assert/strict';
import {auditRacerHoldoutProvenance} from './audit-racer-holdout-provenance.mjs';
const valid={date:'20261119',capturedAt:'2026-11-18T23:00:00Z',cutoffAt:'2026-11-19T11:00:00+09:00',captureProvenance:'server_timestamped',source:'official_live_entry',resultIndependentlyVerified:true,chronologicalHoldout:true};
assert.equal(auditRacerHoldoutProvenance(valid).eligible,true);
assert.equal(auditRacerHoldoutProvenance({...valid,capturedAt:'2026-11-19T12:00:00+09:00'}).eligible,false);
assert.ok(auditRacerHoldoutProvenance({...valid,capturedAt:'2026-11-19T08:00:00'}).issues.includes('timezone_aware_timestamps_required'));
assert.ok(auditRacerHoldoutProvenance({...valid,date:'20261118'}).issues.includes('capture_date_mismatch_jst'));
assert.ok(auditRacerHoldoutProvenance({...valid,cutoffAt:'2026-11-20T11:00:00+09:00'}).issues.includes('cutoff_date_mismatch_jst'));
console.log('JST racer holdout provenance audit tests passed');
