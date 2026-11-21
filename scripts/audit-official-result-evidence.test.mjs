import test from 'node:test';
import assert from 'node:assert/strict';
import {auditOfficialResultEvidence} from './audit-official-result-evidence.mjs';
const good={date:'20261120',venue:18,race:1,verified:true,finishOrder:[1,2,3,4,5,6],
 sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261120&jcd=18&rno=1'};
test('structural check does not assert independent authentication',()=>{
 const out=auditOfficialResultEvidence([good]);
 assert.equal(out.structurallyValid,1);
 assert.equal(out.independentlyAuthenticated,false);
 assert.equal(out.eligibleForCalibration,false);
});
test('duplicate results and mismatched URLs are held',()=>{
 const out=auditOfficialResultEvidence([good,{...good,sourceUrl:good.sourceUrl.replace('rno=1','rno=2')}]);
 assert.equal(out.held,2);
 assert.ok(out.rows[0].reasons.includes('duplicate_official_result_key'));
 assert.ok(out.rows[1].reasons.includes('official_result_url_mismatch'));
});
test('invalid finish order is held',()=>{
 const out=auditOfficialResultEvidence([{...good,finishOrder:[1,1,3,4,5,6]}]);
 assert.equal(out.held,1);
});
