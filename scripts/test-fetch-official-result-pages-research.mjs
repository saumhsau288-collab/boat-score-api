import assert from 'node:assert/strict';
import {fetchOfficialResultPages as run} from './fetch-official-result-pages-research.mjs';
const capture={records:[
 {date:'20261118',venue:1,race:1,response:{ready:true}},
 {date:'20261118',venue:1,race:2,response:{ready:false}},
 {date:'20261118',venue:1,race:3,response:{ready:true}},
 {date:'20261118',venue:'01',race:'03',response:{ready:true}}
]};
const calls=[];
const mock=async(url,opts)=>{
 calls.push({url,opts});
 return {ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>'<html>'+('a'.repeat(110))+'</html>'};
};
const report=await run(capture,{fetchImpl:mock});
assert.equal(report.targets,1);
assert.equal(report.pages[0].status,'raw_html_saved');
assert.equal(report.pages[0].resultVerified,false);
assert.equal(report.verifiedResults,0);
assert.equal(report.eligibleForAccuracy,0);
assert.equal(report.pages[0].sha256.length,64);
assert.equal(calls.length,1);
assert.equal(calls[0].opts.redirect,'error');
assert.match(calls[0].url,/rno=1&jcd=01&hd=20261118/);
const failed=await run({records:[capture.records[0]]},{fetchImpl:async()=>{throw Error('offline')}});
assert.equal(failed.pages[0].status,'fetch_failed');
assert.equal(failed.pages[0].attempts.length,2);
let tries=0;
const recovered=await run({records:[capture.records[0]]},{fetchImpl:async()=>{if(++tries===1)throw Error('timeout');return {ok:true,headers:{get:()=> 'text/html'},text:async()=>'<html>'+('a'.repeat(110))+'</html>'};}});
assert.equal(recovered.pages[0].status,'raw_html_saved');
assert.equal(recovered.pages[0].attempts.length,2);
assert.equal(recovered.pages[0].attempts[0].status,'failed');
assert.equal(recovered.pages[0].attempts[1].status,'saved');
assert.equal(recovered.eligibleForAccuracy,0);
assert.rejects(run(capture,{maxAttempts:4}),/Attempts/);
assert.equal(failed.verifiedResults,0);
assert.rejects(run(capture,{limit:25}),/Limit/);
console.log('Raw official result page retrieval tests passed');
