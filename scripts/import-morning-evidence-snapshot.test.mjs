import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {importMorningEvidenceSnapshot} from './import-morning-evidence-snapshot.mjs';
import {readMorningEvidenceDrafts} from './store-morning-evidence-drafts.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'morning-import-'));
try{
 const file=path.join(dir,'out.ndjson');
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
  nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
  expectedEntryCourse:null,exhibitionTime:null,last50Score:50}));
 const snapshot=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
  capturedAt:'2026-11-22T23:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
  source:'official_live_entry',racers});
 const result=importMorningEvidenceSnapshot(snapshot,file);
 assert.equal(result.imported,true);
 assert.equal(result.verifiedOfficialSources,false);
 assert.equal(readMorningEvidenceDrafts(file).count,1);
 assert.throws(()=>importMorningEvidenceSnapshot(snapshot,file),/Duplicate morning capture/);
 const incomplete=structuredClone(snapshot);
 incomplete.racers[0].values.averageST=null;
 assert.equal(importMorningEvidenceSnapshot(incomplete,file).imported,false);
 assert.equal(readMorningEvidenceDrafts(file).count,1);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('Offline morning snapshot import tests passed');
