import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const file=path.join(os.tmpdir(),'boat-score-race-bottlenecks-'+process.pid+'.json');
try{
 fs.writeFileSync(file,JSON.stringify({date:'20261120',records:[
 {race:1,httpStatus:200,response:{ready:true}},
 {race:7,httpStatus:200,response:{ready:false,reason:'official_six_boat_stats_unverified'}},
 {race:8,error:'The operation was aborted due to timeout'}]}));
 const r=spawnSync(process.execPath,['scripts/report-capture-race-bottlenecks.mjs',file],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const x=JSON.parse(r.stdout);
 assert.equal(x.byRace.length,12);assert.equal(x.firstHalf.ready,1);assert.equal(x.secondHalf.ready,0);
 assert.equal(x.byRace[6].officialStatsUnverified,1);assert.equal(x.byRace[7].timeout,1);
 console.log('Race-number capture bottleneck report passed');
}finally{fs.rmSync(file,{force:true});}
