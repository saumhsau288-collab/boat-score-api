import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-rank-'));
try {
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i===0?9:5,localWinRate:i===1?9:5,motorTwoWinRate:50,recent50WinRate:20,exhibitionScore:50}));
 const file=path.join(temp,'input.json');
 fs.writeFileSync(file,JSON.stringify([{date:'20261118',venue:1,race:1,racers,candidateWeights:{nationalWinRate:25,localWinRate:45,motorTwoWinRate:15,recent50WinRate:10,exhibitionScore:5}},
 {date:'20261118',venue:1,race:2,racers:racers.map((r,i)=>i===2?{...r,recent50WinRate:null}:r),candidateWeights:{nationalWinRate:45,localWinRate:25,motorTwoWinRate:15,recent50WinRate:10,exhibitionScore:5}}]));
 const p=spawnSync(process.execPath,['scripts/preview-score-race-ranking.mjs',file],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const report=JSON.parse(p.stdout);
 assert.equal(report.races,2);
 assert.equal(report.comparisonsReady,1);
 assert.equal(report.rankingChanged,1);
 assert.equal(report.results[0].baselineRank[0],1);
 assert.equal(report.results[0].candidateRank[0],2);
 assert.equal(report.results[1].baselineRank,null);
 assert.equal(report.results[1].actualResultCompared,false);
 assert.equal(report.productionChanged,false);
 console.log('Offline ranking preview tests passed');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
