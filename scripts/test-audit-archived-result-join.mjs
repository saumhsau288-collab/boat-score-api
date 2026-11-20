import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditArchivedResultJoin as audit} from './audit-archived-result-join.mjs';
const html='<table>'+Array.from({length:6},(_,i)=>'<tr><td>'+(i+1)+'</td><td>'+(i+1)+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+(4001+i)+'">R</a></td></tr>').join('')+'</table>';
const url='https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=18&hd=20261120';
const receipt={status:'official_result_source_captured',verified:false,officialResultVerified:false,eligibleForCalibration:false,finishByBoat:null,
 sourceUrl:url,finalUrl:url,date:'20261120',venue:18,race:1,httpStatus:200,contentType:'text/html',requestedAt:'2026-11-20T08:00:00Z',receivedAt:'2026-11-20T08:00:01Z',
 bodyBytes:Buffer.byteLength(html),responseSha256:createHash('sha256').update(html).digest('hex')};
const prediction={expected:{date:'20261120',venue:'18',race:1},source:{receivedAt:'2026-11-20T07:00:00Z',cutoffJst:'12:00'},
 scoreInputsByBoat:Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),scoreComputedAt:'2026-11-20T07:01:00Z'}))};
const result=audit(receipt,html,prediction);
assert.equal(result.status,'structural_match_only');
assert.equal(result.matchedBoats,6);
assert.equal(result.predictionTimestampStructureValid,true);
assert.equal(result.eligibleForWeightTuning,false);
assert.equal(audit(receipt,html,{...prediction,expected:{...prediction.expected,race:2}}).reason,'race_identity_mismatch');
assert.equal(audit(receipt,html,{...prediction,scoreInputsByBoat:prediction.scoreInputsByBoat.map((r,i)=>i===0?{...r,racerId:'4999'}:r)}).reason,'racer_identity_mismatch');
console.log('Archived result join audit tests passed');
