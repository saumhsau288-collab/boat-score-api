import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
import {sealIndependentPredictionDraft} from './seal-independent-prediction-draft.mjs';
import {appendResearchDraft} from './append-independent-research-draft.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-evidence-'));
try {
 const file=path.join(dir,'research.ndjson');
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
  nationalWinRate:6,localWinRate:0,averageST:.15,motorSecondPlaceRate:40,
  expectedEntryCourse:i+1,exhibitionTime:6.8,last50Score:50}));
 const snap=buildRacerInputEvidenceSnapshot({date:'20261123',venue:2,race:1,
  capturedAt:'2026-11-23T00:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
  source:'official_live_entry',racers});
 const sealed=sealIndependentPredictionDraft(snap);
 assert.equal(appendResearchDraft(file,sealed).appended,true);
 assert.equal(fs.readFileSync(file,'utf8').trim().split('\n').length,1);
 assert.throws(()=>appendResearchDraft(file,sealed),/Duplicate/);
 const altered=structuredClone(sealed);
 altered.draft.evidence.racers[0].values.nationalWinRate=9;
 assert.throws(()=>appendResearchDraft(file,altered),/hash mismatch/);
 const next=sealIndependentPredictionDraft({...snap,race:2});
 assert.equal(appendResearchDraft(file,next).count,2);
 assert.equal(fs.readFileSync(file,'utf8').trim().split('\n').length,2);
 console.log('Research-only local append, duplicate and hash guards passed');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
