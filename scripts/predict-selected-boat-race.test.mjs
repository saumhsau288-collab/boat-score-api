import test from 'node:test';
import assert from 'node:assert/strict';
import {predictSelectedRace} from './predict-selected-boat-race.mjs';
test('rejects invalid venue and race before fetching',async()=>{
 let calls=0;const fetchImpl=()=>{calls++;throw Error('should not fetch')};
 assert.equal((await predictSelectedRace({date:'20261119',venue:25,race:1,fetchImpl})).status,'invalid_selection');
 assert.equal(calls,0);
});
test('fetch failure is explicit and never creates fake tickets',async()=>{
 const fetchImpl=async()=>({ok:false,headers:{get:()=> 'text/html'}});
 const r=await predictSelectedRace({date:'20261119',venue:18,race:2,fetchImpl});
 assert.equal(r.status,'official_fetch_failed');assert.equal(r.main.length,0);
});

const html='<html>'+Array.from({length:6},(_,i)=>`<tr><td rowspan="4">${i+1}</td><td rowspan="4">photo</td><td rowspan="4">${4001+i} Racer</td><td rowspan="4">0.15</td><td rowspan="4">6.00</td><td rowspan="4">5.50</td></tr>`).join('')+'</html>';
const validFetch=async()=>({ok:true,headers:{get:()=> 'text/html'},text:async()=>html.padEnd(200,' ')});
test('venue/date/race alone yields provisional 6+6 prediction without claiming verified entry',async()=>{
 const r=await predictSelectedRace({date:'20261119',venue:18,race:2,fetchImpl:validFetch});
 assert.equal(r.status,'experimental');assert.equal(r.entryScenario,'boat_order_assumption');
 assert.equal(r.main.length,6);assert.equal(r.upset.length,6);
 assert.match(r.inputCaveat,/PROVISIONAL/);
});
test('explicit inward entry scenario changes entry warning',async()=>{
 const r=await predictSelectedRace({date:'20261119',venue:18,race:2,courses:[1,2,4,5,6,3],fetchImpl:validFetch});
 assert.equal(r.status,'experimental');assert.equal(r.entryAlerts[0].boat,6);
});
