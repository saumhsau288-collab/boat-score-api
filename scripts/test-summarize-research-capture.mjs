import assert from 'node:assert/strict';
import {summarizeCaptureRows} from './summarize-research-capture.mjs';
const a={httpStatus:200,response:{ready:true}},b={httpStatus:200,response:{ready:false}},c={error:'timeout'};
assert.deepEqual(summarizeCaptureRows([a,b,c,null,null]),{records:[a,b,c],attempted:3,httpSuccess:2,ready:1});
assert.deepEqual(summarizeCaptureRows([null,null]),{records:[],attempted:0,httpSuccess:0,ready:0});
console.log('PASS: stopped capture rows remain null-safe and unattempted');
