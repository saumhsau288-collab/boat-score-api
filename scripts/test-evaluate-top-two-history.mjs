import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-top2-test-'));
const file=path.join(dir,'cases.jsonl');
const racers=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,nationalRate:7-i,localRate:0,averageST:0.15}));
const row={date:'20261122',venue:1,race:1,observedAt:'2026-11-21T23:00:00Z',
 cutoffAt:'2026-11-22T00:00:00Z',sourceVerified:true,resultVerified:true,
 snapshot:{racers},officialFinish:[1,2,3,4,5,6]};
function run(lines){fs.writeFileSync(file,lines.map(x=>JSON.stringify(x)).join('\n'));return spawnSync(process.execPath,
 [new URL('./evaluate-top-two-history.mjs',import.meta.url).pathname,file],{encoding:'utf8'});}
try{
 const ok=run([row]);assert.equal(ok.status,0,ok.stderr);
 const report=JSON.parse(ok.stdout);
 assert.equal(report.inputRows,1);
 assert.deepEqual(report.metrics.map(x=>x.success),[1,1,1]);
 assert.deepEqual(report.metrics.map(x=>x.randomBaseline),[2/3,2/5,1/5]);
 assert.notEqual(run([]).status,0,'empty history must fail');
 assert.notEqual(run([row,row]).status,0,'duplicate race must fail');
 assert.notEqual(run([{...row,observedAt:'2026-11-22T00:00:00Z'}]).status,0,'post-cutoff snapshot must fail');
 assert.notEqual(run([{...row,date:'20261121'}]).status,0,'wrong JST race date must fail');
 assert.notEqual(run([{...row,sourceVerified:false}]).status,0,'unverified source must fail');
 assert.notEqual(run([{...row,officialFinish:[1,1,2,3,4,5]}]).status,0,'invalid finish must fail');
 console.log('Historical evaluator: synthetic fixture accepted; six invalid-input checks passed. No real-race accuracy claimed.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
