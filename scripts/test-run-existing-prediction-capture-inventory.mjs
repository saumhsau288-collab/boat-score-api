import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'boat-score-capture-'));
try{
 writeFileSync(join(dir,'20261118-12345.json'),JSON.stringify({date:'20261118',authenticatedBeforeRace:false,records:[{response:{ready:true,prediction:{main:['1-2-3']}}}]}));
 writeFileSync(join(dir,'official-cutoff-source-evidence.json'),JSON.stringify({records:[]}));
 const run=spawnSync(process.execPath,['scripts/run-existing-prediction-capture-inventory.mjs',dir],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(run.stdout);
 assert.equal(report.files,1);assert.equal(report.ready,1);
 assert.equal(report.withVerifiedPreRaceEvidence,0);
 console.log('Saved prediction capture inventory runner test passed');
}finally{rmSync(dir,{recursive:true,force:true});}
