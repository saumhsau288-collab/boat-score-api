import assert from 'node:assert/strict';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'boat-audit-'));
try{
 const file=join(dir,'report.json');
 writeFileSync(file,JSON.stringify({records:[{status:'compared',actual:'1-2-3',missingInputs:['last50','weather']},{status:'held',missingInputs:['last50']}]}));
 const p=spawnSync(process.execPath,['scripts/audit-calibration-inputs.mjs',file],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const r=JSON.parse(p.stdout);
 assert.equal(r.compared,1);assert.equal(r.held,1);assert.equal(r.usablePreRaceSnapshots,0);
 assert.equal(r.missingInputs.last50,2);assert.equal(r.calibrationReady,false);
 console.log('Calibration input audit tests passed');
}finally{rmSync(dir,{recursive:true,force:true})}
