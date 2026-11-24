import test from 'node:test';
import assert from 'node:assert/strict';
import {createRaceDataClient} from './race-data-client.mjs';
const endpoint='/api/official/race-data';
const selection={date:'20261124',venue:7,race:1};
test('deduplicates concurrent requests and expires cache',async()=>{
 let calls=0,time=0;
 const client=createRaceDataClient({now:()=>time,fetcher:async()=>{calls++;return {ok:true,json:async()=>({...selection,verified:true})}}});
 await Promise.all([client.get(endpoint,selection),client.get(endpoint,selection)]);
 assert.equal(calls,1);
 await client.get(endpoint,selection);assert.equal(calls,1);
 time=15001;await client.get(endpoint,selection);assert.equal(calls,2);
 await client.get(endpoint,selection,{refresh:true});assert.equal(calls,3);
});
test('unverified data is never cached',async()=>{
 let calls=0;
 const client=createRaceDataClient({fetcher:async()=>{calls++;return {ok:true,json:async()=>({verified:false})}}});
 await client.get(endpoint,selection);await client.get(endpoint,selection);assert.equal(calls,2);
});
test('rejects invalid selection and retries failed requests',async()=>{
 let calls=0;
 const client=createRaceDataClient({fetcher:async()=>{calls++;return {ok:false,status:503}}});
 assert.throws(()=>client.get(endpoint,{...selection,race:13}));
 await assert.rejects(client.get(endpoint,selection));await assert.rejects(client.get(endpoint,selection));assert.equal(calls,2);
});
