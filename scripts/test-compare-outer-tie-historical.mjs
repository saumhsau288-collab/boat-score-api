import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'outer-tie-'));
const rows=[
 {date:'20261120',venue:1,race:1,capturedBeforeCutoff:true,officialResultVerified:true,
  actual:[4,2,1],boats:[1,2,3,4,5,6].map((boat,i)=>({boat,course:boat,courseVerified:true,score:[70,85,60,85,50,40][i]}))},
 {date:'20261120',venue:1,race:2,capturedBeforeCutoff:false,officialResultVerified:true,
  actual:[4,2,1],boats:[1,2,3,4,5,6].map(boat=>({boat,course:boat,courseVerified:true,score:80}))}
];
try{
 const file=path.join(dir,'fixtures.json');fs.writeFileSync(file,JSON.stringify(rows));
 const report=JSON.parse(execFileSync(process.execPath,['scripts/compare-outer-tie-historical.mjs',file],{encoding:'utf8'}));
 assert.equal(report.total,2);assert.equal(report.eligible,1);
 assert.equal(report.excluded.unverified_timing_or_result,1);
 assert.equal(report.changed,1);
 assert.equal(report.old.winner,0);assert.equal(report.outer.winner,1);
 assert.equal(report.old.trifecta,0);assert.equal(report.outer.trifecta,1);
 console.log('Outer-tie comparison fixture passed (synthetic, not historical evidence).');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
