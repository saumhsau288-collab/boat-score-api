import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDeployedTicketSlots} from './audit-deployed-ticket-slots.mjs';
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,1,2],[4,2,1],[5,1,2],[5,2,1],[6,1,2],[6,2,1]];
const row={date:'20261122',venue:2,race:3,preRaceVerified:true,savedBeforeCutoff:true,response:{ready:true,main,upset}};
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
