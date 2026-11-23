import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {importMorningOfficialBundle} from './import-morning-official-bundle.mjs';
import {readMorningEvidenceDrafts} from './store-morning-evidence-drafts.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'official-bundle-'));
try{
 const output=path.join(dir,'evidence.ndjson');
 const entry={date:'20261123',venue:2,race:1,
  capturedAt:'2026-11-22T23:00:00Z',cutoffAt:'2026-11-23T01:00:00Z',
  official:{racersVerified:true,statsVerified:true,
   racersByBoat:Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i)})),
   statsByBoat:Array.from({length:6},(_,i)=>({boat:i+1,nationwide:{winRate:6},
    local:{winRate:0},averageST:.15,motor:{secondPlaceRate:40}}))}};
 const bundle={entry,last50ByBoat:Array.from({length:6},(_,i)=>({boat:i+1,score:50}))};
 assert.equal(importMorningOfficialBundle(bundle,output).imported,true);
 assert.equal(readMorningEvidenceDrafts(output).count,1);
 assert.throws(()=>importMorningOfficialBundle(bundle,output),/Duplicate morning capture/);
 const invalid=structuredClone(bundle);
 invalid.last50ByBoat.pop();
 assert.equal(importMorningOfficialBundle(invalid,output).reason,'six_verified_last50_scores_required');
 assert.equal(readMorningEvidenceDrafts(output).count,1);
 assert.equal(importMorningOfficialBundle(null,output).reason,'missing_bundle');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('Research official-entry morning bundle import tests passed');
