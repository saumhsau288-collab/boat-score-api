import test from 'node:test';
import assert from 'node:assert/strict';
import {auditOfficialJoinAdjacency} from './audit-official-join-adjacency.mjs';
test('counts verified historical results without pretending to predict',()=>{
 const report=auditOfficialJoinAdjacency({records:[{date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[5,6,2,1,3,4]}]});
 assert.equal(report.eligible,1);
 assert.equal(report.pointInTimeVerified,0);
 assert.equal(report.byWinningBoat['5'].neighborSecond,1);
});
test('rejects unsupported inputs',()=>assert.throws(()=>auditOfficialJoinAdjacency({}),TypeError));
