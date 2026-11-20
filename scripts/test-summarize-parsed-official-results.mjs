import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {summarizeParsedOfficialResults} from './summarize-parsed-official-results.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-racer-results-'));
try{
 const finishByBoat=Array.from({length:6},(_,i)=>({boat:i+1,finish:6-i,racerId:String(4001+i)}));
 fs.writeFileSync(path.join(dir,'research-result-20261120-18-1-structure.json'),JSON.stringify({verified:true,finishByBoat}));
 fs.writeFileSync(path.join(dir,'research-result-20261120-18-2-structure.json'),JSON.stringify({verified:false,finishByBoat:[]}));
 const result=summarizeParsedOfficialResults(dir);
 assert.equal(result.raceCount,1);
 assert.equal(result.racerFinishes,6);
 assert.equal(result.rows.find(x=>x.racerId==='4006').winner,true);
 assert.equal(result.rows.filter(x=>x.podium).length,3);
 assert.equal(result.excluded.length,1);
 assert.equal(result.preCutoffScoresJoined,0);
 assert.equal(result.eligibleForCalibration,false);
 console.log('Parsed official result racer-outcome summary tests passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
