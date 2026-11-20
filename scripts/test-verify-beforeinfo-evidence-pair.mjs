import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyBeforeinfoEvidencePair as verify} from './verify-beforeinfo-evidence-pair.mjs';
const html='<html><table><tr><td>ST</td></tr></table></html>';
const receipt={status:'beforeinfo_source_captured',verified:false,eligibleForCalibration:false,
 bodyBytes:Buffer.byteLength(html,'utf8'),responseSha256:createHash('sha256').update(html).digest('hex')};
assert.equal(verify(receipt,html).status,'evidence_pair_valid');
assert.equal(verify(receipt,html+'changed').status,'evidence_pair_rejected');
assert.equal(verify({...receipt,bodyBytes:1},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,status:'beforeinfo_source_rejected'},html).status,'evidence_pair_rejected');
assert.equal(verify({...receipt,verified:true},html).status,'evidence_pair_rejected');
console.log('Official beforeinfo evidence pair verification tests passed');
