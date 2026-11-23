import assert from 'node:assert/strict';
import {uniqueHistoricalRaces} from './unique-historical-races.mjs';
const row=(date,venue,race)=>({date,venue,race});
const r=uniqueHistoricalRaces([row('20261124',1,1),row('20261124','01',1),row('20261124',1,2),row('20260230',1,3),row('20261124',25,1)]);
assert.equal(r.uniqueRaceCount,1);
assert.deepEqual(r.rejected,{invalidIdentity:2,duplicateRace:2});
assert.equal(r.accepted[0].race,2);
assert.throws(()=>uniqueHistoricalRaces({}),/rows_must_be_array/);
console.log('Historical identity dedup synthetic assertions passed.');
