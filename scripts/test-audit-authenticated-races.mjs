import assert from 'node:assert/strict';
import {auditAuthenticatedRaces} from './audit-authenticated-races.mjs';
const cutoff=Date.parse('2026-11-19T23:43:00Z');
const good={raceKey:'20261120-18-1',officialCutoffEpochMs:cutoff,
 prediction:{capturedAtEpochMs:cutoff-60000,predictorCommit:'a'.repeat(40),tickets:[[1,3,2]]},
 evidence:{independentCaptureVerified:true,immutableCaptureRef:'artifact:example-only',officialCutoffVerified:true,officialCutoffUrl:'https://www.boatrace.jp/example'},
 racers:Array.from({length:6},(_,i)=>({boat:i+1,racerId:4001+i,preRaceFeaturesVerified:true,featuresCapturedAtEpochMs:cutoff-60000})),
 officialResult:{raceKey:'20261120-18-1',verified:true,officialUrl:'https://www.boatrace.jp/example',finishOrder:[1,3,2,4,5,6]}};
assert.equal(auditAuthenticatedRaces([good]).eligibleCount,1);
assert.equal(auditAuthenticatedRaces([{...good,evidence:{...good.evidence,independentCaptureVerified:false}}]).eligibleCount,0);
assert.equal(auditAuthenticatedRaces([{...good,prediction:{...good.prediction,capturedAtEpochMs:cutoff}}]).eligibleCount,0);
assert.equal(auditAuthenticatedRaces([{...good,racers:good.racers.slice(0,5)}]).eligibleCount,0);
assert.equal(auditAuthenticatedRaces([good,good]).heldCount,1);
assert.equal(auditAuthenticatedRaces([{raceKey:'20261120-18-1',prediction:{tickets:[[1,3,2]]}}]).eligibleCount,0);
console.log('strict historical evidence gate: six synthetic scenarios passed');
