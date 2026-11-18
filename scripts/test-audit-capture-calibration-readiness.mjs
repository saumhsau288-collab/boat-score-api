import assert from 'node:assert/strict';
import {auditCaptureCalibrationReadiness} from './audit-capture-calibration-readiness.mjs';
const r={date:'20261118',venue:1,race:1,receivedAt:'2026-11-18T01:00:00Z',response:{ready:true,rankedScores:[]}};
const c={...r,verified:true,source:'official',sourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist',cutoffAt:'2026-11-18T01:05:00Z'};
const x=auditCaptureCalibrationReadiness({date:r.date,records:[r]});
assert.equal(x.counts.missingCutoff,1);assert.equal(x.counts.missingVerifiedOfficialResults,1);assert.equal(x.eligibleForWeightTuning,0);
const y=auditCaptureCalibrationReadiness({date:r.date,records:[r]},[c]);
assert.equal(y.counts.beforeCutoffTimingOnly,1);assert.equal(y.counts.missingVerifiedOfficialResults,1);assert.equal(y.eligibleForWeightTuning,0);
const z=auditCaptureCalibrationReadiness({date:r.date,records:[{...r,receivedAt:'2026-11-18T01:06:00Z'}]},[c]);
assert.equal(z.counts.afterCutoff,1);
assert.throws(()=>auditCaptureCalibrationReadiness({records:[r]},[c,c]),/Duplicate/);
const invalid=auditCaptureCalibrationReadiness({date:r.date,records:[{...r,receivedAt:'not-a-time'}]},[c]);
assert.equal(invalid.counts.invalidCaptureTime,1);
assert.equal(invalid.counts.missingCutoff,0);
const mismatch=auditCaptureCalibrationReadiness({date:r.date,records:[r]},[{...c,venue:2,date:r.date}]);
assert.equal(mismatch.counts.missingCutoff,1); // Different race key is never assigned to this record.
assert.equal(mismatch.counts.cutoffIdentityMismatch,0);
console.log('Conservative calibration readiness tests passed');
