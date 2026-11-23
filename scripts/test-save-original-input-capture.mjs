import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {saveOriginalInputCapture as save} from './save-original-input-capture.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-research-'));
try{
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,racerId:4000+i,nationalWinRate:5,localWinRate:5,motorTwoWinRate:40,recent50WinRate:30,exhibitionScore:50,startTiming:.15}));
 const input={selection:{date:'20261123',venue:'01',race:'1'},response:{ready:true,
  main:['1-2-3','1-3-2','2-1-3','2-3-1','3-1-2','3-2-1'],
  upset:['4-5-6','4-6-5','5-4-6','5-6-4','6-4-5','6-5-4']},
  cutoffAt:'2026-11-23T02:00:00Z',scoreInputs:racers};
 const at='2026-11-23T01:50:00Z';
 const result=save(input,dir,at);
 assert.equal(result.status,'saved_unverified');
 const saved=JSON.parse(fs.readFileSync(result.file,'utf8'));
 assert.equal(saved.scoreInputs.length,6);
 assert.equal(saved.originalInputsAuthenticated,false);
 assert.equal(saved.preRacePredictionsSaved,false);
 assert.throws(()=>save(input,dir,at),{code:'EEXIST'});
 assert.equal(save({...input,scoreInputs:null},dir,'2026-11-23T01:51:00Z').status,'original_inputs_incomplete');
 assert.equal(fs.readdirSync(dir).length,1);
 console.log('Strict original-input archival fixture passed (synthetic only)');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
