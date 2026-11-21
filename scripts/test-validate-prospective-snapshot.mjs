import test from 'node:test';import assert from 'node:assert/strict';import {validateProspectiveSnapshot} from './validate-prospective-snapshot.mjs';
const base={date:'20261120',venue:1,race:1,capturedAt:'2026-11-20T10:00:00+09:00',scheduledStartAt:'2026-11-20T10:10:00+09:00',sourceUrl:'https://example.org/source',racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,averageStartTiming:0.15}))};
test('accepts complete pre-race evidence',()=>assert.equal(validateProspectiveSnapshot(base).valid,true));
test('rejects capture after start',()=>assert.equal(validateProspectiveSnapshot({...base,capturedAt:'2026-11-20T10:11:00+09:00'}).valid,false));
test('rejects unverified time format and absent ST',()=>{assert.equal(validateProspectiveSnapshot({...base,capturedAt:'2026-11-20T10:00:00'}).valid,false);assert.equal(validateProspectiveSnapshot({...base,racers:base.racers.map(x=>({boat:x.boat,nationalWinRate:5}))}).valid,false);});
