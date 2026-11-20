import assert from 'node:assert/strict';
import {captureOfficialResultEvidence} from './capture-official-result-evidence.mjs';
import {verifyOfficialResultEvidencePair as verify} from './verify-official-result-evidence-pair.mjs';
const selection={date:'20261120',venue:'18',race:1};
const html='<html><body>result</body></html>';
const url='https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=18&hd=20261120';
let tick=0;
const now=()=>new Date(Date.parse('2026-11-20T08:00:00.000Z')+tick++*1000).toISOString();
const receipt=await captureOfficialResultEvidence(selection,async()=>({ok:true,status:200,url,
 headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html}),now,true);
const {rawHtml,...meta}=receipt;
assert.equal(verify(meta,rawHtml).status,'evidence_pair_valid');
assert.equal(verify(meta,rawHtml+'altered').status,'evidence_pair_rejected');
assert.equal(verify({...meta,race:2},rawHtml).sourceValid,false);
assert.equal(verify({...meta,receivedAt:meta.requestedAt,requestedAt:meta.receivedAt},rawHtml).chronologyValid,false);
assert.equal(verify(meta,rawHtml).finishVerified,false);
console.log('Official result evidence pair tests passed');
