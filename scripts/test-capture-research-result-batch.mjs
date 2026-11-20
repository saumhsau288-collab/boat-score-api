import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureResultBatch} from './capture-research-result-batch.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-result-batch-'));
try{
 const selections=[1,2,3].map(race=>({date:'20261120',venue:'18',race}));
 const fetcher=async url=>{
  const race=Number(new URL(url).searchParams.get('rno'));
  if(race===2)throw Error('simulated unavailable result');
  return {ok:true,status:200,url,headers:{get:()=> 'text/html'},
   text:async()=>'<html><body>no verified finish table</body></html>'};
 };
 const summary=await captureResultBatch(selections,{fetcher,outputDir:dir});
 assert.equal(summary.requested,3);
 assert.equal(summary.sourceCaptured,2);
 assert.equal(summary.integrityValid,2);
 assert.equal(summary.structurallyParsed,0);
 assert.equal(summary.eligibleForCalibration,0);
 assert.equal(summary.results[1].status,'official_result_fetch_failed');
 assert.equal(fs.existsSync(path.join(dir,'research-result-batch-summary.json')),true);
 assert.throws(()=>captureResultBatch([...selections,selections[0]],{fetcher,outputDir:dir}),/duplicate/);
 console.log('Multi-race result batch capture tests passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
