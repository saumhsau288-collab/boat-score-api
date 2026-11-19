import assert from 'node:assert/strict';
import {auditSavedComparisonEvidence as audit} from './audit-saved-comparison-evidence.mjs';
const capture={records:[{date:'20261118',venue:1,race:1,receivedAt:'2026-11-18T00:00:00Z'}]};
const empty=audit(capture,{results:[]});assert.equal(empty.missing.officialResult,1);
const result={date:'20261118',venue:1,race:1,verified:true,finishOrder:[1,2,3,4,5,6],sourceUrl:'https://www.boatrace.jp/',officialCutoffAt:'2026-11-18T00:30:00Z'};
const good=audit(capture,{results:[result]});assert.equal(good.capturedBeforeCutoff,1);assert.equal(good.verifiedFinishOrders,1);
const late=audit(capture,{results:[{...result,officialCutoffAt:'2026-11-17T23:00:00Z'}]});assert.equal(late.capturedBeforeCutoff,0);
const duplicate=audit(capture,{results:[result,result]});assert.equal(duplicate.missing.officialResult,1);
for(const time of ['2026-11-18T00:00:00','2026-11-18 00:00:00',null]){
 assert.equal(audit({...capture,records:[{...capture.records[0],receivedAt:time}]},{results:[result]}).capturedBeforeCutoff,0);
 assert.equal(audit(capture,{results:[{...result,officialCutoffAt:time}]}).cutoffsPresent,0);
}
assert.equal(audit({...capture,records:[{...capture.records[0],receivedAt:'2026-11-18T09:00:00+09:00'}]},{results:[result]}).capturedBeforeCutoff,1);
console.log('Saved comparison evidence readiness audit tests passed');
