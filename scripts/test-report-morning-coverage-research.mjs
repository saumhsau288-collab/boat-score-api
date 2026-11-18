import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-coverage-'));
try {
 const input=path.join(dir,'raw.json');
 fs.writeFileSync(input,JSON.stringify({date:'20261118',captureStart:'2026-11-17T23:00:00Z',records:[
  {venue:11,race:1,requestedAt:'2026-11-17T23:02:00Z',httpStatus:200,response:{ready:true}},
  {venue:11,race:2,requestedAt:'2026-11-18T01:10:00Z',error:'timeout'},
  {venue:11,race:3,requestedAt:'2026-11-17T23:04:00Z',httpStatus:200,response:{ready:false}}
 ]}));
 const cli=new URL('./report-morning-coverage-research.mjs',import.meta.url).pathname;
 const run=spawnSync(process.execPath,[cli,input],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(run.stdout);
 assert.equal(report.attempted,3);
 assert.equal(report.captureDateMatchesJst,true);
 assert.equal(report.recordsRequestedInMorningWindow,2);
 assert.equal(report.byVenue[11].ready,1);
 assert.equal(report.byVenue[11].timeout,1);
 assert.equal(report.byVenue[11].notReady,1);
 assert.equal(report.authenticatedBeforeRace,false);
 console.log('Saved capture coverage CLI integration test passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
