import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {sealIndependentPredictionDraft} from './seal-independent-prediction-draft.mjs';
import {appendResearchDraft} from './append-independent-research-draft.mjs';
import {readIndependentResearchDrafts} from './read-independent-research-drafts.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-read-'));
try{
 const file=path.join(dir,'drafts.ndjson');
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
  nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
  expectedEntryCourse:i+1,exhibitionTime:6.8,last50Score:50}));
 const snap=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
  capturedAt:'2026-11-23T00:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
  source:'official_live_entry',racers});
 const sealed=sealIndependentPredictionDraft(snap);
 appendResearchDraft(file,sealed);
 const loaded=readIndependentResearchDrafts(file);
 assert.equal(loaded.count,1);
 assert.equal(loaded.verifiedOfficialSources,false);
 assert.deepEqual(loaded.records[0].draft,sealed.draft);
 fs.appendFileSync(file,JSON.stringify({sha256:sealed.sha256,draft:sealed.draft})+'\n');
 assert.throws(()=>readIndependentResearchDrafts(file),/Duplicate/);
 fs.writeFileSync(file,'{bad-json}\n');
 assert.throws(()=>readIndependentResearchDrafts(file),/Malformed/);
 console.log('Research draft roundtrip, duplicate and malformed record tests passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
