import assert from 'node:assert/strict';
import {summarizeCaptureRows} from './summarize-research-capture.mjs';
const a={httpStatus:200,response:{ready:true}},b={httpStatus:200,response:{ready:false}},c={error:'timeout'};
assert.deepEqual(summarizeCaptureRows([a,b,c,null,null],{stoppedForOfficial403:true}),{
 records:[a,b,c],attempted:3,planned:5,unattempted:2,stoppedForOfficial403:true,httpSuccess:2,ready:1,stopReason:'consecutive_official_http_403'
});
assert.deepEqual(summarizeCaptureRows([null,null]),{
 records:[],attempted:0,planned:2,unattempted:2,stoppedForOfficial403:false,httpSuccess:0,ready:0,stopReason:null
});
assert.throws(()=>summarizeCaptureRows([a],{planned:0}),/Invalid planned count/);
console.log('PASS: stopped capture summary preserves stop reason and unattempted count');
