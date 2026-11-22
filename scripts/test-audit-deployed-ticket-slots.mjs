import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDeployedTicketSlots} from './audit-deployed-ticket-slots.mjs';
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,1,2],[4,2,1],[5,1,2],[5,2,1],[6,1,2],[6,2,1]];
const row={date:'20261122',venue:2,race:3,preRaceVerified:true,savedBeforeCutoff:true,receivedAt:'2026-11-22T10:00:00+09:00',officialCutoffAt:'2026-11-22T10:10:00+09:00',response:{ready:true,main,upset}};
const result={date:'20261122',venue:2,race:3,verified:true,officialCutoffAt:'2026-11-22T10:10:00+09:00',sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261122&jcd=02&rno=3',finishOrder:[4,1,2,3,5,6]};
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

test('rejects official result URL for a different race',()=>{
 const other={...result,sourceUrl:result.sourceUrl.replace('rno=3','rno=4')};
 assert.equal(auditDeployedTicketSlots({authenticatedBeforeRace:true,records:[row]},[other]).summary.compared,0);
});
test('three duplicated result rows never become eligible',()=>{
 const out=auditDeployedTicketSlots({authenticatedBeforeRace:true,records:[row]},[result,result,result]);
 assert.equal(out.summary.compared,0);
 assert.equal(out.summary.held,1);
});

test('prediction-supplied cutoff cannot override independently supplied official cutoff',()=>{
 const forged={...row,officialCutoffAt:'2026-11-22T23:59:00+09:00',receivedAt:'2026-11-22T10:11:00+09:00'};
 const out=auditDeployedTicketSlots({authenticatedBeforeRace:true,records:[forged]},[result]);
 assert.equal(out.summary.compared,0);
});
test('fractional-second timestamp before cutoff is accepted',()=>{
 const precise={...row,receivedAt:'2026-11-22T10:00:00.125+09:00'};
 assert.equal(auditDeployedTicketSlots({authenticatedBeforeRace:true,records:[precise]},[result]).summary.compared,1);
});
