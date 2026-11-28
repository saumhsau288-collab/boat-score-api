import assert from 'node:assert/strict';
import {prepareMorningEvidenceFromOfficialEntry} from './prepare-morning-evidence-from-official-entry.mjs';
const statsByBoat=Array.from({length:6},(_,i)=>({boat:i+1,
 nationwide:{winRate:6},local:{winRate:0},averageST:.15,motor:{secondPlaceRate:40}}));
const racersByBoat=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i)}));
const args={date:'20261123',venue:2,race:1,capturedAt:'2026-11-22T23:00:00Z',
 cutoffAt:'2026-11-23T01:00:00Z',
 official:{racersVerified:true,statsVerified:true,statsByBoat,racersByBoat}};
const last50=Array.from({length:6},(_,i)=>({boat:i+1,score:50}));
const good=prepareMorningEvidenceFromOfficialEntry(args,last50);
assert.equal(good.ready,true);
assert.equal(good.sealed.envelope.racers.length,6);
assert.equal(good.sealed.envelope.racers[0].values.last50Score,50);
assert.equal(good.sealed.envelope.racers[0].values.exhibitionTime,null);
assert.equal(good.sealed.envelope.methodCount,0);
assert.equal(good.verifiedOfficialSources,false);
assert.equal(prepareMorningEvidenceFromOfficialEntry(args,last50.slice(0,5)).reason,'six_verified_last50_scores_required');
assert.equal(prepareMorningEvidenceFromOfficialEntry({...args,official:{...args.official,statsVerified:false}},last50).ready,false);
const bad=structuredClone(args);
bad.official.statsByBoat[0].averageST=null;
assert.equal(prepareMorningEvidenceFromOfficialEntry(bad,last50).reason,'missing_required_phase_features');
console.log('Official entry and last-50 morning evidence bridge tests passed');
