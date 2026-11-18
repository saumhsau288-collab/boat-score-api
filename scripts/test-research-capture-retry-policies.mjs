#!/usr/bin/env node
// Offline smoke test for research-only retry report; no network or deployed app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-retry-'));
const file=path.join(dir,'fixture.json');
const stamp=ms=>new Date(Date.UTC(2026,10,18,0,0,0)+ms).toISOString();
const attempt=(n,start,duration,httpStatus,error)=>({attempt:n,requestedAt:stamp(start),receivedAt:stamp(start+duration),...(httpStatus?{httpStatus}:{error})});
try{
 const records=[
  {attempts:[attempt(1,0,8000,200)]},
  {attempts:[attempt(1,0,18000,200)]},
  {attempts:[attempt(1,0,20000,null,'The operation was aborted due to timeout'),attempt(2,20000,7000,200)]},
  {attempts:[attempt(1,0,20000,null,'timeout'),attempt(2,20000,10000,null,'timeout')]},
  {attempts:[]}
 ];
 fs.writeFileSync(file,JSON.stringify({records}));
 const result=spawnSync(process.execPath,[new URL('./research-capture-retry-policies.mjs',import.meta.url).pathname,file],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.records,5);
 const current=report.policies.find(p=>p.name==='current');
 assert.equal(current.observedFirstSuccess,2);
 assert.equal(current.observedRetrySuccess,1);
 assert.equal(current.observedFirstTimeout,2);
 assert.equal(current.unknown,1);
 const shorter=report.policies.find(p=>p.name==='shorter_first');
 assert.equal(shorter.observedFirstSuccess,1);
 assert.equal(shorter.cannotInfer,1);
 assert.match(report.warning,/NOT a counterfactual simulation/);
 console.log('research retry policy offline smoke test passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
