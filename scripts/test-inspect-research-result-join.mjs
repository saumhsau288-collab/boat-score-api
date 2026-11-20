import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectResearchResultJoin as join} from './inspect-research-result-join.mjs';
const expected={date:'20261120',venue:'18',race:1};
const url='https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=18&hd=20261120';
const rows=Array.from({length:6},(_,i)=>'<tr><td>'+(i+1)+'</td><td>'+(i+1)+'</td><td>'+(4001+i)+' R</td><td>1:50</td></tr>').join('');
const html='<table><tr><th>着</th><th>枠</th><th>ボートレーサー</th><th>レースタイム</th></tr>'+rows+'</table>';
const metadata={status:'official_result_source_captured',verified:false,officialResultVerified:false,eligibleForCalibration:false,
 finishByBoat:null,sourceUrl:url,finalUrl:url,date:'20261120',venue:18,race:1,httpStatus:200,contentType:'text/html',
 requestedAt:'2026-11-20T08:00:00Z',receivedAt:'2026-11-20T08:00:01Z',bodyBytes:Buffer.byteLength(html),
 responseSha256:createHash('sha256').update(html).digest('hex')};
const scoreInputsByBoat=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),score:50}));
const args={metadata,html,expected,scoreInputsByBoat};
assert.equal(join(args).status,'structural_match_only');
assert.equal(join(args).matchedBoats,6);
assert.equal(join(args).eligibleForWeightTuning,false);
assert.equal(join({...args,scoreInputsByBoat:scoreInputsByBoat.map((r,i)=>i===0?{...r,racerId:'4999'}:r)}).reason,'racer_identity_mismatch');
assert.equal(join({...args,expected:{...expected,race:2}}).reason,'race_identity_mismatch');
assert.equal(join({...args,html:html+'changed'}).reason,'result_evidence_pair_invalid');
console.log('Research result racer identity join tests passed');
