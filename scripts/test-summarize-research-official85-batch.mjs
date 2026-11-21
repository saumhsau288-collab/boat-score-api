import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-review-'));
const captureDir=path.join(directory,'prediction-captures');
const date='20261120',venue=1,race=5;
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4001+i),name:'Racer '+(i+1),sourceVerified:true,
 nationalWinRate:9-i,localWinRate:9-i,motorTwoWinRate:50
}));
const official={status:'captured_research_inputs',source:'verified_official_metrics',
 date,venue,race,racers};
const result={status:'official_racelist_result_identity_matched',
 parsedStatus:'parsed_needs_independent_review',date,venue,race,
 identityCheck:{status:'official_racelist_result_identity_matched'},
 parsedPodium:[2,4,1],independentResultVerification:false};
try{
 fs.mkdirSync(captureDir);
 for(const [prefix,data] of [
  ['official',official],['result',result],
  ['makulabo',{status:'held',reason:'abbreviated_name_requires_review'}]
 ]){
  fs.writeFileSync(path.join(captureDir,'research-'+prefix+'-'+date+'-'+venue+'-'+race+'.json'),
   JSON.stringify(data));
 }
 const script=fileURLToPath(new URL('./summarize-research-official85-batch.mjs',import.meta.url));
 const output=execFileSync(process.execPath,[script],{
  cwd:directory,encoding:'utf8',
  env:{...process.env,CAPTURE_DATE:date,CAPTURE_VENUE:String(venue),
   FIRST_RACE:String(race),LAST_RACE:String(race),GITHUB_STEP_SUMMARY:''}
 });
 assert.match(output,/Comparable retrospective races: 1/);
 assert.match(output,/Makulabo availability is diagnostic only/);
 const saved=JSON.parse(fs.readFileSync(path.join(captureDir,
  'research-review-'+date+'-'+venue+'-'+race+'-'+race+'.json'),'utf8'));
 assert.equal(saved.compared,1);
 assert.equal(saved.records[0].makulaboStatus,'held');
 assert.equal(saved.records[0].status,'research_only_podium_compared');
 assert.deepEqual(saved.records[0].actualPodiumScoreRanks,[2,4,1]);
 assert.equal(saved.eligibleForCalibration,false);
 assert.equal(saved.scoreChangeApplied,false);
 console.log('Batch review works with Makulabo held; score and finish ranks independently compared');
}finally{
 fs.rmSync(directory,{recursive:true,force:true});
}
