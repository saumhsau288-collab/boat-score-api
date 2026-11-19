import test from 'node:test';import assert from 'node:assert/strict';
import {fetchHistoricalRacelistSample} from './fetch-historical-racelist-sample.mjs';
const html='<html>'+('race data '.repeat(20))+'</html>';
const good={ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html};
test('retries transient server failures and keeps official URL and hash',async()=>{
 let calls=0;const r=await fetchHistoricalRacelistSample({date:'20261119',venue:18,race:2,fetchImpl:async()=>{calls++;return calls===1?{ok:false,status:503}:good;}});
 assert.equal(calls,2);assert.equal(r.status,'raw_html_saved');assert.equal(r.sha256.length,64);assert.match(r.url,/jcd=18/);
});
test('does not retry permanent missing race',async()=>{
 let calls=0;const r=await fetchHistoricalRacelistSample({date:'20261119',venue:18,race:2,fetchImpl:async()=>{calls++;return {ok:false,status:404};}});
 assert.equal(calls,1);assert.equal(r.status,'fetch_failed');assert.match(r.error,/404/);
});
