import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spatial-comparison-'));
try{
 const file=path.join(dir,'races.json');
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,score:8-i,avgStart:.12+i*.01}));
 fs.writeFileSync(file,JSON.stringify({races:[{raceKey:'fixture',racers,finishOrder:[1,2,3,4,5,6]}]}));
 let p=spawnSync(process.execPath,['scripts/run-spatial-hypothesis-comparison.mjs',file],{encoding:'utf8'});
 assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).hitRatesPercent.baselineAny,null);
 fs.writeFileSync(file,JSON.stringify({races:[{raceKey:'fixture',racers,finishOrder:[1,2,3,4,5,6],independentlyVerifiedPreRace:true,officialResultVerified:true}]}));
 p=spawnSync(process.execPath,['scripts/run-spatial-hypothesis-comparison.mjs',file],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);const out=JSON.parse(p.stdout);assert.equal(out.eligible,1);
 assert.ok(out.hitRatesPercent.baselineAny===0||out.hitRatesPercent.baselineAny===100);
 assert.ok(out.hitRatesPercent.spatialAny===0||out.hitRatesPercent.spatialAny===100);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS: spatial comparison CLI rejects missing provenance and calculates synthetic fixture rates');
