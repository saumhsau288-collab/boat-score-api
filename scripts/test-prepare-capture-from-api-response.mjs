import assert from 'node:assert/strict';
import {prepareCaptureFromApiResponse} from './prepare-capture-from-api-response.mjs';
const main=['1-2-3','1-3-2','2-1-3','2-3-1','3-1-2','3-2-1'];
const upset=['4-5-6','4-6-5','5-4-6','5-6-4','6-4-5','6-5-4'];
const input={selection:{date:'20261123',venue:'01',race:'1'},
 response:{ready:true,main,upset},cutoffAt:'2026-11-23T02:00:00Z',
 capturedAt:'2026-11-23T01:50:00Z'};
const result=prepareCaptureFromApiResponse(input);
assert.equal(result.status,'prepared_not_authenticated');
assert.deepEqual(result.snapshot.main[0],[1,2,3]);
assert.equal(result.snapshot.main.length,6);
assert.equal(result.snapshot.upset.length,6);
assert.equal(result.snapshot.preRacePredictionsSaved,false);
assert.equal(prepareCaptureFromApiResponse({...input,response:{ready:false,main,upset}}).status,'prediction_not_ready');
assert.equal(prepareCaptureFromApiResponse({...input,response:{ready:true,main:main.slice(1),upset}}).status,'invalid_or_after_cutoff');
assert.equal(prepareCaptureFromApiResponse({...input,capturedAt:input.cutoffAt}).status,'invalid_or_after_cutoff');
console.log('API-to-capture fixture tests passed');
