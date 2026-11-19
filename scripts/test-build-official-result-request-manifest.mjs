import assert from 'node:assert/strict';
import {buildOfficialResultRequestManifest as build} from './build-official-result-request-manifest.mjs';
const capture={records:[
 {date:'20261118',venue:1,race:2},{date:'20261118',venue:'01',race:'02'},
 {date:'20261118',venue:24,race:12},{date:'20260230',venue:1,race:1},
 {date:'20261118',venue:25,race:1}
]};
const result=build(capture);
assert.equal(result.requested,2);
assert.equal(result.duplicateKeys,1);
assert.deepEqual(result.invalidCaptureRows,[3,4]);
assert.equal(result.verifiedResults,0);
assert.equal(result.eligibleForAccuracy,0);
assert.equal(result.requests[0].captureCount,2);
assert.equal(result.requests[0].duplicateCaptureKey,true);
assert.equal(result.requests[0].officialResultPageUrl,'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=2&jcd=01&hd=20261118');
assert.equal(result.requests[1].officialResultPageUrl,'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=12&jcd=24&hd=20261118');
assert.throws(()=>build({records:null}));
console.log('Official result request manifest tests passed');
