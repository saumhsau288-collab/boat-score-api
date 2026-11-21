import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const file=path.join(os.tmpdir(),'boat-score-saved-readiness-'+process.pid+'.json');
try{
 fs.writeFileSync(file,JSON.stringify({date:'20261122',records:[
  {date:'20261122',venue:1,race:1,httpStatus:200,responseSha256:'a'.repeat(64),response:{ready:true}},
  {date:'20261122',venue:1,race:2,httpStatus:200,response:{ready:false}},
  {date:'20261122',venue:1,race:3,error:'timeout'}]}));
 const run=spawnSync(process.execPath,['scripts/report-saved-capture-readiness.mjs',file],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const x=JSON.parse(run.stdout);
 assert.equal(x.total,3);assert.equal(x.ready,1);assert.equal(x.hashPresent,1);
 assert.equal(x.eligibleForCalibration,0);
 assert.equal(x.records[0].reason,'original_inputs_not_authenticated');
 assert.equal(x.records[1].reason,'predictor_not_ready');
 assert.equal(x.records[2].reason,'request_failed');
 console.log('Saved capture readiness inventory test passed');
}finally{fs.rmSync(file,{force:true});}
