import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'saved-capture-compare-'));
try{
 const capture=path.join(dir,'capture.json'),results=path.join(dir,'results.json');
 const picks=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
 fs.writeFileSync(capture,JSON.stringify({authenticatedBeforeRace:true,records:[{date:'20261118',venue:1,race:1,httpStatus:200,receivedAt:'2026-11-18T00:00:00Z',response:{ready:true,main:picks,upset:picks}}]}));
 const run=()=>spawnSync(process.execPath,['scripts/run-saved-capture-result-comparison.mjs',capture,results],{encoding:'utf8'});
 fs.writeFileSync(results,JSON.stringify({results:[]}));
 const held=run();assert.equal(held.status,1);assert.equal(JSON.parse(held.stdout).compared,0);
 fs.writeFileSync(results,JSON.stringify({results:[{date:'20261118',venue:1,race:1,verified:true,finishOrder:[1,2,3,4,5,6],sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=01&hd=20261118',officialCutoffAt:'2026-11-18T00:30:00Z'}]}));
 const compared=run();assert.equal(compared.status,0);assert.equal(JSON.parse(compared.stdout).mainHits,1);
 const wrongUrl=JSON.parse(fs.readFileSync(results,'utf8'));
 wrongUrl.results[0].sourceUrl='https://www.boatrace.jp/owpc/pc/race/raceresult?rno=2&jcd=01&hd=20261118';
 fs.writeFileSync(results,JSON.stringify(wrongUrl));
 const rejected=run();assert.equal(rejected.status,1);assert.equal(JSON.parse(rejected.stdout).compared,0);
 wrongUrl.results[0].sourceUrl='https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=01&hd=20261118';
 fs.writeFileSync(results,JSON.stringify(wrongUrl));
 const unauthenticated=JSON.parse(fs.readFileSync(capture,'utf8'));
 unauthenticated.authenticatedBeforeRace=false;
 fs.writeFileSync(capture,JSON.stringify(unauthenticated));
 const blocked=run();assert.equal(blocked.status,1);assert.equal(JSON.parse(blocked.stdout).compared,0);
 assert.equal(spawnSync(process.execPath,['scripts/run-saved-capture-result-comparison.mjs',capture,capture],{encoding:'utf8'}).status!==0,true);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('Saved capture comparison CLI tests passed');
