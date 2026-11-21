import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-evidence-'));
try{
 const race={date:'20261122',venue:21,race:4};
 const receivedAt='2026-11-22T00:10:00Z',sha='a'.repeat(64);
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),sourceVerified:true}));
 const official={...race,status:'captured_research_inputs',receivedAt,sourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist?rno=4&jcd=21&hd=20261122',responseSha256:sha,racers};
 const common=racers.map(x=>({...race,boat:x.boat,racerId:x.racerId,verified:true,receivedAt,sourceUrl:'https://example.org/source',responseSha256:sha}));
 const st={rows:common.map(x=>({...x,kind:'pre_race_average_st',value:0.16}))};
 const mk={rows:common.map(x=>({...x,scope:'same_labelled_frame_recent_up_to_50_all_venues',runs:50,firstPlaceRate:20}))};
 const prediction={...race,receivedAt:'2026-11-22T00:20:00Z',cutoffAt:'2026-11-22T00:30:00Z'};
 const names=['race','official','st','mk','prediction'];
 const files=names.map((n,i)=>{const p=path.join(dir,n+'.json');fs.writeFileSync(p,JSON.stringify([race,official,st,mk,prediction][i]));return p;});
 const run=()=>spawnSync(process.execPath,['scripts/report-live-feature-readiness.mjs',...files],{encoding:'utf8'});
 const ok=run();assert.equal(ok.status,0,ok.stderr);const ready=JSON.parse(ok.stdout);
 assert.equal(ready.status,'source_evidence_ready_original_inputs_unverified');
 assert.equal(ready.eligibleForCalibration,false);
 fs.writeFileSync(files[3],JSON.stringify({rows:mk.rows.slice(1)}));
 const held=run();assert.equal(held.status,2);assert.equal(JSON.parse(held.stdout).status,'held');
 console.log('Live feature readiness CLI smoke test passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
