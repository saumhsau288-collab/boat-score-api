import test from 'node:test';
import assert from 'node:assert/strict';
import {runAudit} from './run-adjacent-podium-audit.mjs';
test('accepts verified result records and returns per-winner summary',()=>{
 const row={date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[5,6,2,1,3,4]};
 const r=runAudit({records:[row]});
 assert.equal(r.eligible,1);
 assert.equal(r.byWinningBoat['5'].neighborSecond,1);
 assert.equal(r.byWinningBoat['5'].expectedPodiumRate,0.7);
});
test('rejects unsupported input',()=>assert.throws(()=>runAudit({wrong:[]}),TypeError));
