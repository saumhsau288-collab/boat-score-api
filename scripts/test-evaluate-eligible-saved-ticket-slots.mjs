import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEligibleSavedTicketSlots} from './evaluate-eligible-saved-ticket-slots.mjs';
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,1,2],[4,2,1],[5,1,2],[5,2,1],[6,1,2],[6,2,1]];
const row={date:'20261122',venue:2,race:3,receivedAt:'2026-11-22T10:00:00+09:00',httpStatus:200,response:{ready:true,main,upset}};
const result={date:'20261122',venue:2,race:3,verified:true,officialCutoffAt:'2026-11-22T10:10:00+09:00',sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261122&jcd=02&rno=3',finishOrder:[4,1,2,3,5,6]};
test('uses strict admission and counts each deployed ticket position',()=>{
 const out=evaluateEligibleSavedTicketSlots({authenticatedBeforeRace:true,records:[row]},[result]);
 assert.equal(out.compared,1);assert.equal(out.slots['upset-1'].hits,1);
 assert.equal(out.coverage.allTwelve,1);
});
test('no fabricated rate when capture authenticity is missing',()=>{
 const out=evaluateEligibleSavedTicketSlots({records:[row]},[result]);
 assert.equal(out.compared,0);assert.equal(out.slots['main-1'].rate,null);
 assert.equal(out.held,1);
});
test('late response excluded even when ticket matches',()=>{
 const out=evaluateEligibleSavedTicketSlots({authenticatedBeforeRace:true,records:[{...row,receivedAt:'2026-11-22T10:11:00+09:00'}]},[result]);
 assert.equal(out.compared,0);assert.equal(out.held,1);
});
