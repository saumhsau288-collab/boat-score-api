import assert from 'node:assert/strict';
import {auditPreRaceFeatureSnapshots} from './audit-pre-race-feature-snapshots.mjs';
const fields={nationalWinRate:6,localWinRate:0,motorTwoWinRate:40,recent50WinRate:20,exhibitionScore:70};
const records=[{date:'20261120',venue:2,race:9,receivedAt:'2026-11-19T23:00:00Z',
 officialCutoffAt:'2026-11-20T00:00:00Z',response:{ready:true,scoreInputsByBoat:Array.from({length:6},(_,i)=>({boat:i+1,...fields}))}}];
const r=auditPreRaceFeatureSnapshots({records});
assert.equal(r.completeSixBoatFeatures,1);
assert.equal(r.rows[0].receivedBeforeClaimedCutoff,true);
assert.equal(r.eligibleForHistoricalCalibration,0);
assert.equal(auditPreRaceFeatureSnapshots({records:[{response:{ready:true}}]}).completeSixBoatFeatures,0);
const bad={records:[{response:{ready:true,scoreInputsByBoat:Array.from({length:6},(_,i)=>({boat:i+1,...fields,motorTwoWinRate:i===0?120:40}))}}]};
assert.equal(auditPreRaceFeatureSnapshots(bad).completeSixBoatFeatures,0);
console.log('pre-race feature snapshot audit tests passed');
