import test from 'node:test';import assert from 'node:assert/strict';import {buildProspectiveRaceRecord} from './build-prospective-race-record.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5}));
const base={venue:'戸田',date:'20261121',race:3,source:'official',capturedAt:'2026-11-21T10:00:00+09:00',scheduledStartAt:'2026-11-21T10:10:00+09:00',racers};
test('preserves missing fields as null and does not self-verify source',()=>{const x=buildProspectiveRaceRecord(base);assert.equal(x.racers[0].averageStartTiming,null);assert.equal(x.sourceVerified,false);assert.equal(x.racers.length,6);});
test('rejects post-start snapshot and duplicate boats',()=>{assert.throws(()=>buildProspectiveRaceRecord({...base,capturedAt:base.scheduledStartAt}));assert.throws(()=>buildProspectiveRaceRecord({...base,racers:[...racers.slice(0,5),racers[0]]}));});
