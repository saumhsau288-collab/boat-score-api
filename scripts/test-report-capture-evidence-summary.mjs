import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-capture-summary-'));
try{
 const base='20261119-123';
 const save=(suffix,obj)=>fs.writeFileSync(path.join(dir,base+suffix+'.json'),JSON.stringify(obj));
 save('',{date:'20261119',records:[{response:{ready:true}},{response:{ready:false}}]});
 save('-diagnostics',{counts:{networkTimeout:1}});
 save('-cutoff-candidates',{counts:{readyBeforeCandidate:1,readyAfterCandidate:0,readyMissingCandidate:0}});
 save('-calibration-readiness',{eligibleForWeightTuning:0});
 save('-deployed-ticket-replay',{matched:1,mismatched:0});
 const out=execFileSync(process.execPath,['scripts/report-capture-evidence-summary.mjs',dir],{encoding:'utf8'});
 assert.match(out,/Requests attempted \| 2/);
 assert.match(out,/Ready predictions \| 1/);
 assert.match(out,/Before UNVERIFIED cutoff candidate \| 1/);
 assert.match(out,/Verified eligible for weight tuning \| 0/);
 assert.match(out,/NOT independently verified/);
 console.log('Capture evidence summary test passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
