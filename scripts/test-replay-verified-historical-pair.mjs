import assert from 'node:assert/strict';
import {replayVerifiedHistoricalPair as replay} from './replay-verified-historical-pair.mjs';
const sha='a'.repeat(64);
const base={date:'20261120',venue:1,race:1,
 featureEvidence:{capturedAt:'2026-11-20T08:00:00+09:00',raceCutoffAt:'2026-11-20T10:00:00+09:00'},
 resultEvidence:{independentlyVerified:true,officialResultUrl:'https://example.org/result',sha256:sha,capturedAt:'2026-11-20T11:00:00+09:00'}};
assert.equal(replay({...base,resultEvidence:{}}).reason,'official_result_evidence_missing');
assert.equal(replay({...base,featureEvidence:{...base.featureEvidence,capturedAt:'2026-11-20T11:00:00+09:00'}}).reason,'pre_cutoff_feature_capture_unverified');
assert.equal(replay({...base,resultEvidence:{...base.resultEvidence,capturedAt:'2026-11-20T09:00:00+09:00'}}).reason,'result_capture_timing_invalid');
assert.equal(replay({...base,featureEvidence:{...base.featureEvidence,raceCutoffAt:'2026-11-19T10:00:00+09:00',capturedAt:'2026-11-19T08:00:00+09:00'}}).reason,'race_date_or_cutoff_mismatch');
assert.equal(replay(base).reason,'historical_pre_result_features_not_authenticated');
assert.equal(replay(base).eligibleForDeployment,false);
console.log('Historical official-result and pre-cutoff replay gate tests passed');
