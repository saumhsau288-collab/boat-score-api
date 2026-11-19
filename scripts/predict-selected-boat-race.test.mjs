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
