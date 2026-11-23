import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'saved-spatial-cli-'));
try{
 const paths=['capture.json','results.json','snapshots.json'].map(x=>path.join(dir,x));
 const picks=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
 const capture={authenticatedBeforeRace:true,records:[{date:'20261118',venue:1,race:1,httpStatus:200,receivedAt:'2026-11-18T00:00:00Z',response:{ready:true,main:picks,upset:picks}}]};
 const official={results:[{date:'20261118',venue:1,race:1,verified:true,finishOrder:[1,2,3,4,5,6],sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261118&jcd=01&rno=1',officialCutoffAt:'2026-11-18T00:30:00Z'}]};
 const snapshot={date:'20261118',venue:1,race:1,snapshotAt:'2026-11-17T23:59:00Z',independentlyVerifiedPreRace:true,racers:Array.from({length:6},(_,i)=>({boat:i+1,score:8-i,avgStart:.12+i*.01}))};
 const run=()=>spawnSync(process.execPath,['scripts/run-saved-tickets-to-spatial.mjs',...paths],{encoding:'utf8'});
 fs.writeFileSync(paths[0],JSON.stringify(capture));fs.writeFileSync(paths[1],JSON.stringify(official));fs.writeFileSync(paths[2],JSON.stringify({snapshots:[]}));
 let p=run();assert.equal(p.status,1,p.stderr);assert.equal(JSON.parse(p.stdout).compared,0);
 fs.writeFileSync(paths[2],JSON.stringify({snapshots:[snapshot]}));
 p=run();assert.equal(p.status,0,p.stderr);assert.equal(JSON.parse(p.stdout).compared,1);
 fs.writeFileSync(paths[2],JSON.stringify({snapshots:[{...snapshot,snapshotAt:'2026-11-18T00:02:00Z'}]}));
 p=run();assert.equal(p.status,1,p.stderr);assert.equal(JSON.parse(p.stdout).compared,0);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS: paired saved/spatial CLI refuses missing and late snapshots');
