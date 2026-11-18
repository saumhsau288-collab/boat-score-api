import assert from 'node:assert/strict';
import {auditHistoricalTuningReadiness} from './audit-historical-tuning-readiness.mjs';
const r=auditHistoricalTuningReadiness([{date:'20261118',venue:2,race:3,actual:[1,2,3],boats:[]}]);
assert.equal(r.ready,0);assert.equal(r.blocked,1);
assert.ok(r.missing.six_boats);assert.ok(r.missing.pre_cutoff_timing);
assert.ok(r.missing.historical_input_evidence);
console.log('Historical tuning readiness audit passed');
