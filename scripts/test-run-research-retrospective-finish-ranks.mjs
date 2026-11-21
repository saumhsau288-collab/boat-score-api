import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const record=(race,podium)=>({
 date:'20261118',venue:1,race,status:'research_only_podium_compared',
 eligibleForCalibration:false,authenticatedHistoricalPrediction:false,
 scoreRanking:[1,2,3,4,5,6],parsedPodium:podium,
 actualPodiumScoreRanks:podium.map(n=>n)
});
test('saved official85 batch is read end-to-end without deploying',()=>{
 const dir=mkdtempSync(join(tmpdir(),'boat-research-'));
 try{
  const path=join(dir,'research-review.json');
  writeFileSync(path,JSON.stringify({status:'research_only_batch_review',records:[
   record(1,[5,6,1]),record(2,[5,2,6])
  ]}));
  const result=spawnSync(process.execPath,['scripts/run-research-retrospective-finish-ranks.mjs',path],{
   encoding:'utf8',cwd:process.cwd()
  });
  assert.equal(result.status,0,result.stderr);
  const x=JSON.parse(result.stdout);
  assert.equal(x.compared,2);
  assert.equal(x.positions[1].rankCounts[5],1);
  assert.equal(x.conditionalPairs.find(p=>p.winner===5&&p.candidate===6).third,1);
  assert.equal(x.eligibleForCalibration,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('runner refuses non-research saved batch',()=>{
 const dir=mkdtempSync(join(tmpdir(),'boat-research-'));
 try{
  const path=join(dir,'bad.json');
  writeFileSync(path,JSON.stringify({status:'authenticated_prediction',records:[]}));
  const result=spawnSync(process.execPath,['scripts/run-research-retrospective-finish-ranks.mjs',path],{
   encoding:'utf8',cwd:process.cwd()
  });
  assert.notEqual(result.status,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
