import assert from 'node:assert/strict';
import {officialBeforeinfoUrl,captureOfficialBeforeinfo} from './capture-official-beforeinfo-evidence.mjs';
const selection={date:'20261120',venue:18,race:1};
const target=officialBeforeinfoUrl(selection);
assert.equal(target.status,'ok');
assert.equal(new URL(target.url).pathname,'/owpc/pc/race/beforeinfo');
assert.equal(officialBeforeinfoUrl({...selection,race:13}).status,'invalid_selection');
const fake=(url,contentType='text/html',ok=true)=>async()=>({
 url,status:ok?200:404,ok,headers:{get:k=>k==='content-type'?contentType:null},
 text:async()=>'<html><body>fixture</body></html>'
});
const clock=()=> '2026-11-20T01:00:00.000Z';
const good=await captureOfficialBeforeinfo(selection,fake(target.url),clock);
assert.equal(good.status,'beforeinfo_source_captured');
assert.equal(good.verified,false);
assert.equal(good.preRaceIndependentlyVerified,false);
assert.equal(good.eligibleForCalibration,false);
assert.deepEqual(good.racers,[]);
assert.equal('rawHtml' in good,false);
const raw=await captureOfficialBeforeinfo(selection,fake(target.url),clock,true);
assert.equal(raw.rawHtml,'<html><body>fixture</body></html>');
assert.equal(raw.responseSha256,good.responseSha256);
const rejectedRaw=await captureOfficialBeforeinfo(selection,fake(target.url,'application/json'),clock,true);
assert.equal('rawHtml' in rejectedRaw,false);
assert.match(good.responseSha256,/^[a-f0-9]{64}$/);
const wrong=await captureOfficialBeforeinfo(selection,fake(target.url.replace('rno=1','rno=2')),clock);
assert.equal(wrong.status,'beforeinfo_source_rejected');
assert.equal((await captureOfficialBeforeinfo(selection,fake(target.url+'&rno=2'),clock)).status,'beforeinfo_source_rejected');
assert.equal((await captureOfficialBeforeinfo(selection,fake(target.url+'&unexpected=1'),clock)).status,'beforeinfo_source_rejected');
assert.equal((await captureOfficialBeforeinfo(selection,fake(target.url,'application/json'),clock)).status,'beforeinfo_source_rejected');
assert.equal((await captureOfficialBeforeinfo(selection,fake(target.url,'text/html',false),clock)).status,'beforeinfo_source_rejected');
console.log('Official beforeinfo evidence capture synthetic tests passed');
