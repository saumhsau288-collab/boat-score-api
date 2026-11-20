import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyBeforeinfoEvidencePair as verify} from './verify-beforeinfo-evidence-pair.mjs';
const html='<html><table><tr><td>ST</td></tr></table></html>';
const sourceUrl='https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=1&jcd=18&hd=20261120';
const receipt={status:'beforeinfo_source_captured',verified:false,preRaceIndependentlyVerified:false,eligibleForCalibration:false,
 sourceUrl,finalUrl:sourceUrl,
 requestedAt:'2026-11-20T01:00:00.000Z',headersReceivedAt:'2026-11-20T01:00:01.000Z',receivedAt:'2026-11-20T01:00:03.000Z',date:'20261120',venue:18,race:1,httpStatus:200,contentType:'text/html; charset=utf-8',
 bodyBytes:Buffer.byteLength(html,'utf8'),responseSha256:createHash('sha256').update(html).digest('hex')};
assert.equal(verify(receipt,html).status,'evidence_pair_valid');
assert.equal(verify(receipt,html+'changed').status,'evidence_pair_rejected');
assert.equal(verify({...receipt,bodyBytes:1},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,status:'beforeinfo_source_rejected'},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,verified:true},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,receivedAt:'2026-11-20T00:59:59.000Z'},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,headersReceivedAt:undefined},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,preRaceIndependentlyVerified:true},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,race:2},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,finalUrl:sourceUrl.replace('rno=1','rno=2')},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,sourceUrl:sourceUrl.replace('www.boatrace.jp','example.com'),finalUrl:sourceUrl.replace('www.boatrace.jp','example.com')},html).status,'evidence_pair_rejected');
console.log('Official beforeinfo evidence pair verification tests passed');
