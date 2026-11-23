import assert from 'node:assert/strict';
import {runCapturePool} from './run-research-capture-pool.mjs';
import {createOfficial403CircuitBreaker} from './official-403-circuit-breaker.mjs';
const tasks=Array.from({length:12},(_,i)=>i);
const forbidden={response:{officialStatsRetry:'official_http_403'}};
let started=0;
const result=await runCapturePool(tasks,async(_,index)=>{
 started++;
 await Promise.resolve();
 return {...forbidden,index};
},{concurrency:3,breaker:createOfficial403CircuitBreaker(3)});
assert.equal(result.stoppedForOfficial403,true);
assert.equal(result.attempted,3);
assert.equal(started,3);
assert.equal(result.planned,12);
assert.deepEqual(result.records.slice(0,3).map(r=>r.index),[0,1,2]);
assert.equal(result.records[3],null);
const breaker=createOfficial403CircuitBreaker(2);
const mixed=await runCapturePool([1,2,3,4,5],async(_,i)=>i===0||i===1?forbidden:{response:{ready:true}},{concurrency:1,breaker});
assert.equal(mixed.attempted,2);
assert.equal(mixed.stoppedForOfficial403,true);
await assert.rejects(()=>runCapturePool([],async()=>null,{concurrency:0,breaker}),/Invalid concurrency/);

// Batch boundaries: a single 403 in each batch is not a consecutive streak.
const seen=[];
const resets=await runCapturePool(Array.from({length:9},(_,i)=>i),async(_,i)=>{
 seen.push(i);
 return i===2||i===5||i===8?forbidden:{response:{ready:true}};
},{concurrency:3,breaker:createOfficial403CircuitBreaker(3)});
assert.equal(resets.attempted,9);
assert.equal(resets.stoppedForOfficial403,false);
assert.deepEqual(seen,[0,1,2,3,4,5,6,7,8]);
// Even if completion order differs, the next batch must wait for all current requests.
const deferred=[];
const pending=runCapturePool([0,1,2,3,4,5],async(_,i)=>new Promise(resolve=>{
 deferred[i]=resolve;
}),{concurrency:3,breaker:createOfficial403CircuitBreaker(2)});
await Promise.resolve();
assert.equal(deferred.length,3);
deferred[0](forbidden);
deferred[1](forbidden);
await Promise.resolve();
assert.equal(deferred.length,3);
deferred[2](forbidden);
const bounded=await pending;
assert.equal(bounded.attempted,3);
assert.equal(bounded.stoppedForOfficial403,true);
assert.equal(deferred.length,3);

console.log('PASS: concurrent capture pool halts dispatch after upstream 403');
