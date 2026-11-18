#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-input-audit-'));
try {
 const target=path.join(dir,'data.json');
 const records=[
 {venue:1,race:1,error:'The operation was aborted due to timeout'},
 {venue:1,race:2,httpStatus:200,response:{ready:false,reason:'official_six_boat_stats_unverified'}},
 {venue:1,race:3,httpStatus:200,response:{ready:true,missingInputs:['last50','weather']}},
 {venue:1,race:4,httpStatus:200,response:{ready:true,missingInputs:[]}}
 ];
 fs.writeFileSync(target,JSON.stringify({date:'20261118',attempted:4,records}));
 const result=spawnSync(process.execPath,[new URL('./audit-morning-input-coverage.mjs',import.meta.url).pathname,target],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.counts.timeout,1);
 assert.equal(report.counts.unverifiedOfficialSixBoatStats,1);
 assert.equal(report.counts.readyWithMissingInputs,1);
 assert.equal(report.counts.readyWithNoMissingInputs,1);
 assert.equal(report.missingInputsAmongReady.last50,1);
 console.log('Morning input coverage audit tests passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
