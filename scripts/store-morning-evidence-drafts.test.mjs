import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {sealMorningEvidenceDraft} from './seal-morning-evidence-draft.mjs';
import {appendMorningEvidenceDraft,readMorningEvidenceDrafts} from './store-morning-evidence-drafts.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-morning-'));
try{
 const file=path.join(dir,'morning.ndjson');
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
  nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
  expectedEntryCourse:null,exhibitionTime:null,last50Score:50}));
 const snap=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
  capturedAt:'2026-11-22T23:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
  source:'official_live_entry',racers});
 const sealed=sealMorningEvidenceDraft(snap);
 assert.equal(appendMorningEvidenceDraft(file,sealed).count,1);
 assert.equal(readMorningEvidenceDrafts(file).count,1);
 assert.equal(readMorningEvidenceDrafts(file).verifiedOfficialSources,false);
 assert.throws(()=>appendMorningEvidenceDraft(file,sealed),/Duplicate morning capture/);
 const rows=fs.readFileSync(file,'utf8').trim().split('\n');
 const modified=JSON.parse(rows[0]);
 modified.envelope.racers[0].values.nationalWinRate=9;
 fs.writeFileSync(file,JSON.stringify(modified)+'\n');
 assert.throws(()=>readMorningEvidenceDrafts(file),/Morning integrity failure/);
 assert.throws(()=>appendMorningEvidenceDraft(file,sealed),/Morning integrity failure/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('Local morning append, readback, duplicate and tamper tests passed');
