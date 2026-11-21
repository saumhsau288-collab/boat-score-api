import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const p=path.join(os.tmpdir(),'boat-score-raw-official-'+process.pid+'.html');
try{
 const row=n=>'<tr><td>'+n+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+(4000+n)+'">選手'+n+'</a></td></tr>';
 fs.writeFileSync(p,Array.from({length:6},(_,i)=>row(i+1)).join(''));
 const r=spawnSync(process.execPath,['scripts/compare-saved-official-html-parsers.mjs',p],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const x=JSON.parse(r.stdout);
 assert.equal(x.files,1);assert.equal(x.manualReview,1);assert.equal(x.bothParsersAgree,0);
 assert.equal(x.results[0].strict.verified,true);
 assert.match(x.results[0].sha256,/^[a-f0-9]{64}$/);
 console.log('Saved official HTML parser comparison passed');
}finally{fs.rmSync(p,{force:true});}
