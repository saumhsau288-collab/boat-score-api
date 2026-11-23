import assert from 'node:assert/strict';
import {retryFailedOfficialPages} from './retry-failed-official-pages.mjs';
const base={pages:[
 {date:'20261118',venue:2,race:1,status:'raw_html_saved',html:'original'},
 {date:'20261118',venue:2,race:2,status:'fetch_failed',error:'timeout'},
 {date:'20261118',venue:2,race:3,status:'fetch_failed',error:'timeout'}
]};
let calls=0;
const result=await retryFailedOfficialPages(base,{fetcher:async({date,venue,races})=>{
 calls++;assert.equal(date,'20261118');assert.equal(venue,2);
 return {pages:[races[0]===2?{date,venue,race:2,status:'raw_html_saved',html:'retried'}:
  {date,venue,race:3,status:'fetch_failed',error:'still timed out'}]};
}});
assert.equal(calls,2);assert.equal(result.retryAttempted,2);assert.equal(result.retryRecovered,1);
assert.equal(result.pages[0].html,'original');
assert.equal(result.pages[1].html,'retried');
assert.equal(result.pages[2].status,'fetch_failed');
const noRetry=await retryFailedOfficialPages({pages:[base.pages[0]]},{fetcher:async()=>{throw Error('should not run')}});
assert.equal(noRetry.retryAttempted,0);
console.log('PASS: failed official pages retried once without modifying successful captures');
