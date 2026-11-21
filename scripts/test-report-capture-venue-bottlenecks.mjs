import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const p=path.join(os.tmpdir(),'boat-score-venue-bottlenecks-'+process.pid+'.json');
try{
 fs.writeFileSync(p,JSON.stringify({date:'20261120',run:{workflowRunId:'123'},records:[
 {venue:2,response:{ready:true},httpStatus:200},
 {venue:2,error:'The operation was aborted due to timeout'},
 {venue:21,httpStatus:200,response:{ready:false,reason:'official_six_boat_stats_unverified'}}]}));
 const r=spawnSync(process.execPath,['scripts/report-capture-venue-bottlenecks.mjs',p],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const x=JSON.parse(r.stdout);
 assert.deepEqual(x.totals,{attempted:3,ready:1,timeout:1,otherError:0,officialStatsUnverified:1,otherUnready:0});
 assert.equal(x.byVenue.length,2);assert.equal(x.sourceRun,'123');
 console.log('Venue bottleneck breakdown passed');
}finally{fs.rmSync(p,{force:true});}
