import assert from 'node:assert/strict';
import {auditCaptureIntegrity as audit} from './audit-capture-integrity.mjs';
const row={date:'20261124',venue:1,race:1,phase:'morning',capturedAt:'2026-11-24T08:00:00+09:00',racers:Array.from({length:6},(_,i)=>({boat:i+1}))};
assert.equal(audit([row]).valid,true);
assert.equal(audit([row,{...row,phase:'prestart'}]).valid,true);
for(const [rows,reason] of [[[row,row],'duplicate_capture'],[[{...row,venue:25}],'invalid_identity'],[[{...row,capturedAt:'2026-11-24T08:00:00'}],'invalid_capture_time'],[[{...row,racers:row.racers.slice(0,5)}],'invalid_boat_mapping'],[[{...row,racers:row.racers.map(()=>({boat:1}))}],'invalid_boat_mapping']]){const result=audit(rows);assert.equal(result.valid,false);assert.ok(result.issues.some(x=>x.reason===reason));}
assert.equal(audit(null).valid,false);
console.log('PASS: 8 capture integrity cases');
