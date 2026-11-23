import assert from 'node:assert/strict';
import {auditMorningCollectorCompatibility as audit} from './audit-morning-collector-compatibility.mjs';
assert.deepEqual(audit(null).issues.includes('missing_entry'),true);
const entry={date:'20261123',venue:2,race:1,capturedAt:'2026-11-22T23:00:00Z',
 cutoffAt:'2026-11-23T01:00:00Z',
 official:{racersVerified:true,statsVerified:true,
  racersByBoat:Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i)})),
  statsByBoat:Array.from({length:6},(_,i)=>({boat:i+1,nationwide:{winRate:6},
   local:{winRate:0},averageST:.15,motor:{secondPlaceRate:40}}))}};
const last50ByBoat=Array.from({length:6},(_,i)=>({boat:i+1,score:50}));
const good=audit({entry,last50ByBoat});
assert.equal(good.compatible,true);
assert.equal(good.authenticatedCapture,false);
assert.equal(good.morningMethodCount,0);
const missing=audit({entry,last50ByBoat:last50ByBoat.slice(0,5)});
assert.equal(missing.compatible,false);
assert.ok(missing.issues.includes('last50_six_rows_required'));
const bad=structuredClone(entry);
bad.official.statsByBoat[0].motor.secondPlaceRate=null;
assert.equal(audit({entry:bad,last50ByBoat}).canImport,false);
console.log('Morning collector compatibility audit tests passed');
