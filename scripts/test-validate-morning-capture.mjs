#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const validator = new URL('./validate-morning-capture.mjs', import.meta.url).pathname;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-capture-test-'));
const target = path.join(dir, 'capture.json');
const six = [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset = [[4,1,2],[4,2,1],[5,1,2],[5,2,1],[6,1,2],[6,2,1]];
const row = {date:'20261118',venue:1,race:1,requestedAt:'2026-11-17T23:00:00Z',
 receivedAt:'2026-11-17T23:00:01Z',httpStatus:200,
 response:{ready:true,main:six,upset}};
const base = {date:'20261118',attempted:1,httpSuccess:1,ready:1,
 authenticatedBeforeRace:false,records:[row]};
function run(data) {
 fs.writeFileSync(target,JSON.stringify(data));
 return spawnSync(process.execPath,[validator,target],{encoding:'utf8'});
}
try {
 const ok=run(base);
 assert.equal(ok.status,0,ok.stderr);
 const parsed=JSON.parse(ok.stdout);
 assert.equal(parsed.validMainSixAndUpsetSix,1);
 assert.equal(parsed.authenticatedBeforeRace,false);
 const timed={...base,captureStart:'2026-11-17T22:59:59Z',captureEnd:'2026-11-17T23:00:02Z',captureJstDate:'20261118',captureTimeJst:'08:59',captureDateMatchesJst:true,scheduledMorningWindow:false};
 assert.equal(run(timed).status,0);
 assert.notEqual(run({...timed,captureJstDate:'20261117'}).status,0);
 assert.notEqual(run({...timed,captureDateMatchesJst:false}).status,0);
 assert.notEqual(run({...timed,scheduledMorningWindow:true}).status,0);
 assert.notEqual(run({...timed,captureEnd:'2026-11-17T23:00:00Z'}).status,0);
 const inWindow={...timed,captureStart:'2026-11-17T22:59:59Z'};
 assert.equal(inWindow.scheduledMorningWindow,false);

 assert.notEqual(run({...base,records:[row,row],attempted:2,httpSuccess:2,ready:2}).status,0);
 assert.notEqual(run({...base,records:[{...row,receivedAt:'2026-11-17T22:59:59Z'}]}).status,0);
 assert.notEqual(run({...base,authenticatedBeforeRace:true}).status,0);
 assert.notEqual(run({...base,ready:0}).status,0);
 assert.notEqual(run({...base,records:[{...row,responseSha256:'not-a-sha256'}]}).status,0);
 assert.notEqual(run({...base,records:[{...row,rawResponseNonJson:true}]}).status,0);
 assert.equal(run({...base,records:[{...row,responseSha256:'a'.repeat(64),rawResponseNonJson:false}]}).status,0);
 assert.notEqual(run({...base,records:[{...row,httpStatus:503}]}).status,0);
 assert.notEqual(run({...base,records:[{...row,httpStatus:undefined}]}).status,0);
 assert.notEqual(run({...base,records:[{...row,error:'timeout'}]}).status,0);
 const network={...row,error:'timeout',httpStatus:undefined,response:undefined};
 const networkData={...base,httpSuccess:0,ready:0,records:[network]};
 assert.equal(run(networkData).status,0);
 const invalid=run({...base,records:[{...row,response:{ready:true,main:[six[0],...six.slice(1,5),six[0]],upset}}]});
 assert.equal(invalid.status,0,invalid.stderr);
 assert.equal(JSON.parse(invalid.stdout).validMainSixAndUpsetSix,0);
 console.log('Morning capture validator tests passed');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
