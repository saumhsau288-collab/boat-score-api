import assert from 'node:assert/strict';
import {validateHistoricalProvenance} from './validate-historical-provenance.mjs';
const valid={capturedAt:'2026-11-24T12:00:00+09:00',cutoffAt:'2026-11-24T12:05:00+09:00',scoreModelVersion:'research-v1',preRaceSourceUrl:'https://example.org/prediction',officialResultUrl:'https://example.org/result',capturedBeforeCutoff:true,officialResultVerified:true};
assert.equal(validateHistoricalProvenance(valid).valid,true);
assert.equal(validateHistoricalProvenance({...valid,capturedAt:valid.cutoffAt}).valid,false);
assert.equal(validateHistoricalProvenance({...valid,scoreModelVersion:''}).valid,false);
assert.equal(validateHistoricalProvenance({...valid,preRaceSourceUrl:''}).valid,false);
assert.equal(validateHistoricalProvenance({...valid,officialResultVerified:false}).valid,false);
console.log('Synthetic provenance gate passed; URLs and flags still require external authentication.');
