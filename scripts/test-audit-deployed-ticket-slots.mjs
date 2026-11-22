import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDeployedTicketSlots} from './audit-deployed-ticket-slots.mjs';
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,1,2],[4,2,1],[5,1,2],[5,2,1],[6,1,2],[6,2,1]];
const row={date:'20261122',venue:2,race:3,preRaceVerified:true,savedBeforeCutoff:true,receivedAt:'2026-11-22T10:00:00+09:00',officialCutoffAt:'2026-11-22T10:10:00+09:00',response:{ready:true,main,upset}};
const result={date:'20261122',venue:2,race:3,verified:true,finishOrder:[4,1,2,3,5,6]};
test('counts saved deployed slots without calling them independent methods',()=>{
 const r=auditDeployedTicketSlots({authenticatedBeforeRace:true,records:[row]},[result]);
 assert.equal(r.summary.compared,1);assert.equal(r.slots['upset-1'].hits,1);
 assert.equal(r.slots['main-1'].hits,0);assert.equal(r.coverage.upsetSix,1);
 assert.match(r.warning,/not twelve independent methods/);
});
test('unverified capture is held',()=>{
 const r=auditDeployedTicketSlots({authenticatedBeforeRace:false,records:[row]},[result]);
 assert.equal(r.summary.compared,0);assert.equal(r.summary.held,1);
});

test('late response is not counted as a pre-race prediction',()=>{
 const late={...row,receivedAt:'2026-11-22T10:11:00+09:00'};
 const out=auditDeployedTicketSlots({authenticatedBeforeRace:true,records:[late]},[result]);
 assert.equal(out.summary.compared,0);
 assert.equal(out.summary.holdReasons.pre_race_unverified,1);
});
