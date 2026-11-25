import test from 'node:test';
import assert from 'node:assert/strict';
import {probeOfficialTwelveInputs} from './probe-official-twelve-inputs.mjs';
test('invalid selection does not issue a network request',async()=>{
 let called=false;
 const r=await probeOfficialTwelveInputs({date:'invalid',venue:2,race:1},async()=>{called=true;});
 assert.equal(r.status,'invalid_selection');assert.equal(called,false);
});
test('upstream failures remain errors, not verified inputs',async()=>{
 const r=await probeOfficialTwelveInputs({date:'20261122',venue:2,race:1},async()=>({ok:false,status:503}));
 assert.equal(r.status,'upstream_error');
 assert.equal(r.httpStatus,503);
});
test('non-html responses are rejected',async()=>{
 const r=await probeOfficialTwelveInputs({date:'20261122',venue:2,race:1},async()=>({ok:true,headers:{get:()=> 'application/json'}}));
 assert.equal(r.status,'invalid_content_type');
});
test('unparseable html cannot produce fabricated six-racer records',async()=>{
 const r=await probeOfficialTwelveInputs({date:'20261122',venue:2,race:1},async()=>({ok:true,headers:{get:()=> 'text/html'},text:async()=>'<html>no race data</html>'}));
 assert.equal(r.status,'insufficient_data');
 assert.equal(r.racers,undefined);
});
