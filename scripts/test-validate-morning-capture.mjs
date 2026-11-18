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
 assert.notEqual(run({...base,records:[row,row],attempted:2,httpSuccess:2,ready:2}).status,0);
 assert.notEqual(run({...base,records:[{...row,receivedAt:'2026-11-17T22:59:59Z'}]}).status,0);
 assert.notEqual(run({...base,authenticatedBeforeRace:true}).status,0);
 assert.notEqual(run({...base,ready:0}).status,0);
 const invalid=run({...base,records:[{...row,response:{ready:true,main:[six[0],...six.slice(1,5),six[0]],upset}}]});
 assert.equal(invalid.status,0,invalid.stderr);
 assert.equal(JSON.parse(invalid.stdout).validMainSixAndUpsetSix,0);
 console.log('Morning capture validator tests passed');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
