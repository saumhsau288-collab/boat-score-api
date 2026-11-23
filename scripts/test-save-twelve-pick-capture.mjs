import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-capture-'));
try {
 const main=['1-2-3','1-3-2','2-1-3','2-3-1','3-1-2','3-2-1'];
 const upset=['4-5-6','4-6-5','5-4-6','5-6-4','6-4-5','6-5-4'];
 const file=path.join(tmp,'api.json');
 const input={selection:{date:'20261123',venue:'01',race:'1'},
  response:{ready:true,main,upset},cutoffAt:'2099-11-23T02:00:00Z'};
 fs.writeFileSync(file,JSON.stringify(input));
 const script=new URL('./save-twelve-pick-capture.mjs',import.meta.url).pathname;
 const run=()=>spawnSync(process.execPath,[script,file,tmp],{encoding:'utf8'});
 const first=run();
 assert.equal(first.status,0,first.stderr);
 const saved=fs.readdirSync(tmp).filter(x=>x.endsWith('.json')&&x!=='api.json');
 assert.equal(saved.length,1);
 const snapshot=JSON.parse(fs.readFileSync(path.join(tmp,saved[0]),'utf8'));
 assert.equal(snapshot.main.length,6);
 assert.equal(snapshot.upset.length,6);
 assert.equal(snapshot.preRacePredictionsSaved,false);
 assert.equal(snapshot.independentlyAuthenticatedCapture,false);
 input.cutoffAt='2000-01-01T00:00:00Z';
 fs.writeFileSync(file,JSON.stringify(input));
 assert.equal(run().status,1);
 assert.equal(fs.readdirSync(tmp).filter(x=>x.endsWith('.json')&&x!=='api.json').length,1);
 console.log('Capture CLI integration fixture passed (not live capture)');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
