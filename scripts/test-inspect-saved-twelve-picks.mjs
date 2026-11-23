import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectSavedTwelvePickDirectory as inspect} from './inspect-saved-twelve-picks.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-inspect-'));
try{
 fs.writeFileSync(path.join(dir,'a.json'),JSON.stringify({date:'20261123',main:[],upset:[]}));
 fs.writeFileSync(path.join(dir,'b.json'),'{broken');
 fs.writeFileSync(path.join(dir,'readme.txt'),'ignored');
 const result=inspect(dir);
 assert.equal(result.filesScanned,2);
 assert.equal(result.parsedFiles,1);
 assert.deepEqual(result.invalidFiles,['b.json']);
 assert.equal(result.readiness.eligibleRaces,0);
 assert.equal(result.readiness.missingEvidenceCounts.authenticated_capture,1);
 console.log('Saved twelve-pick directory inspection fixture passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
