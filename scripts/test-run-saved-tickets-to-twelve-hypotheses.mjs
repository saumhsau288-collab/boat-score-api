import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-twelve-cli-'));
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,1,2],[4,2,1],[5,1,2],[5,2,1],[6,1,2],[6,2,1]];
const capture={authenticatedBeforeRace:true,records:[{date:'20261118',venue:1,race:1,httpStatus:200,receivedAt:'2026-11-18T00:00:00Z',response:{ready:true,main,upset}}]};
const official={results:[{date:'20261118',venue:1,race:1,verified:true,finishOrder:[1,2,3,4,5,6],sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261118&jcd=01&rno=1',officialCutoffAt:'2026-11-18T00:30:00Z'}]};
const snapshot={date:'20261118',venue:1,race:1,snapshotAt:'2026-11-17T23:59:00Z',independentlyVerifiedPreRace:true,racers:Array.from({length:6},(_,i)=>({boat:i+1,score:8-i,avgStart:.12+i*.01}))};
const script=new URL('./run-saved-tickets-to-twelve-hypotheses.mjs',import.meta.url).pathname;
try{
 const paths=['capture.json','official.json','snapshots.json'].map(x=>path.join(dir,x));
 const write=(snap)=>{[capture,official,{snapshots:[snap]}].forEach((v,i)=>fs.writeFileSync(paths[i],JSON.stringify(v)));};
 write(snapshot);
 const ok=spawnSync(process.execPath,[script,...paths],{encoding:'utf8'});
 assert.equal(ok.status,0,ok.stderr);
 const report=JSON.parse(ok.stdout);
 assert.equal(report.compared,1);
 assert.equal(report.twelveHypotheses.strategyBreakdown.length,12);
 write({...snapshot,independentlyVerifiedPreRace:false});
 const held=spawnSync(process.execPath,[script,...paths],{encoding:'utf8'});
 assert.equal(held.status,1,held.stderr);
 assert.equal(JSON.parse(held.stdout).compared,0);
 const usage=spawnSync(process.execPath,[script],{encoding:'utf8'});
 assert.equal(usage.status,2);
 console.log('PASS: offline twelve-strategy CLI accepts verified synthetic input and rejects held data');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
