import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'boat-score-venue-'));
const file=join(dir,'schedule.json');
const run=(env={})=>spawnSync(process.execPath,['scripts/guard-research-active-venue.mjs'],{
 env:{...process.env,CAPTURE_DATE:'20261120',CAPTURE_VENUE:'10',OFFICIAL_SCHEDULE_EVIDENCE_PATH:'',...env},encoding:'utf8'});
try{
 assert.equal(run().status,2);
 writeFileSync(file,JSON.stringify({date:'20261120',safeToFilterByActivity:true,verifiedActiveVenues:[2,8],authentication:'independently_verified_official_schedule'}));
 assert.equal(run({OFFICIAL_SCHEDULE_EVIDENCE_PATH:file}).status,2);
 writeFileSync(file,JSON.stringify({date:'20261120',safeToFilterByActivity:true,verifiedActiveVenues:[10],authentication:'independently_verified_official_schedule'}));
 assert.equal(run({OFFICIAL_SCHEDULE_EVIDENCE_PATH:file}).status,0);
 writeFileSync(file,JSON.stringify({date:'20261120',safeToFilterByActivity:true,verifiedActiveVenues:[10]}));
 assert.equal(run({OFFICIAL_SCHEDULE_EVIDENCE_PATH:file}).status,2);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('Research venue guard tests passed');
