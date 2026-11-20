import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateOfficialRaceUrl,captureOfficialHtml,saveCapture} from './capture-official-html-evidence.mjs';
const expected={date:'20261120',venue:'18',race:1};
const url='https://www.boatrace.jp/owpc/pc/race/beforeinfo?hd=20261120&jcd=18&rno=1';
assert.equal(validateOfficialRaceUrl(url,expected).hostname,'www.boatrace.jp');
assert.throws(()=>validateOfficialRaceUrl(url.replace('rno=1','rno=3'),expected),/race_identity_mismatch/);
assert.throws(()=>validateOfficialRaceUrl(url.replace('www.boatrace.jp','www.boatrace.jp.evil.example'),expected),/non_official_url/);
const fake=async()=>new Response('<html><body>Test only</body></html>',{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
const {body,metadata}=await captureOfficialHtml({url,expected,fetchImpl:fake});
assert.equal(metadata.cutoffVerified,false);
assert.equal(metadata.raceIdentityVerified,false);
assert.equal(metadata.sha256.length,64);
const dir=await mkdtemp(join(tmpdir(),'boat-score-capture-'));
try {
 const prefix=await saveCapture({body,metadata,dir});
 assert.deepEqual(await readFile(join(dir,prefix+'.html')),body);
 const saved=JSON.parse(await readFile(join(dir,prefix+'.json'),'utf8'));
 assert.equal(saved.sha256,metadata.sha256);
 await assert.rejects(()=>saveCapture({body,metadata,dir}),{code:'EEXIST'});
} finally {await rm(dir,{recursive:true,force:true});}
await assert.rejects(()=>captureOfficialHtml({url,expected,fetchImpl:async()=>new Response('bad',{status:503,headers:{'content-type':'text/html'}})}),/unexpected_response/);
console.log('Capture tests passed: URL, mismatch, host, metadata, save, duplicate, HTTP error');
