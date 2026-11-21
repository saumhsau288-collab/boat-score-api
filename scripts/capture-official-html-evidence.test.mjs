import test from 'node:test';
import assert from 'node:assert/strict';
import {captureOfficialHtml,validateOfficialRaceUrl} from './capture-official-html-evidence.mjs';
const expected={date:'20261120',venue:'18',race:1};
const url='https://www.boatrace.jp/owpc/pc/race/beforeinfo?hd=20261120&jcd=18&rno=1';
const html='<html><body>Research evidence fixture</body></html>';
const response=({url:final=url,body=html,status=200,type='text/html'}={})=>({
 status,redirected:false,url:final,headers:new Headers({'content-type':type}),
 arrayBuffer:async()=>new TextEncoder().encode(body).buffer
});
test('records full response bytes, timestamps and hash without claiming verification',async()=>{
 const stamps=[new Date('2026-11-20T00:00:00Z'),new Date('2026-11-20T00:00:01Z')];
 const {body,metadata}=await captureOfficialHtml({url,expected,fetchImpl:async()=>response(),now:()=>stamps.shift()});
 assert.equal(body.toString(),html);
 assert.equal(metadata.byteLength,Buffer.byteLength(html));
 assert.match(metadata.sha256,/^[a-f0-9]{64}$/);
 assert.equal(metadata.cutoffVerified,false);
 assert.equal(metadata.raceIdentityVerified,false);
 assert.equal(metadata.receivedAt,'2026-11-20T00:00:01.000Z');
});
test('rejects wrong race identity or unsupported origin',()=>{
 assert.throws(()=>validateOfficialRaceUrl(url,{...expected,race:2}),/race_identity_mismatch/);
 assert.throws(()=>validateOfficialRaceUrl(url.replace('www.boatrace.jp','example.org'),expected),/non_official_url/);
});
test('rejects unexpected final URL and oversized HTML',async()=>{
 await assert.rejects(captureOfficialHtml({url,expected,fetchImpl:async()=>response({url:url+'&x=1'})}),/final_url_mismatch/);
 await assert.rejects(captureOfficialHtml({url,expected,maxBytes:10,fetchImpl:async()=>response()}),/too_large/);
});
