import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'boat-score-weight-'));
try{
 const boats=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6-i,localWinRate:i+1,motorTwoWinRate:0,recent50WinRate:0,exhibitionScore:0}));
 const row=(date,actual)=>({date,venue:1,race:1,boats,actual,independentlyVerifiedResult:true,historicalInputProvenanceVerified:true,historicalInputSourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist',officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',historicalInputCapturedAt:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T08:00:00+09:00',officialCutoffAt:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T12:00:00+09:00'});
 const rows=join(dir,'rows.json'),config=join(dir,'config.json');
 writeFileSync(rows,JSON.stringify({rows:[row('20261101',[6,5,4]),row('20261102',[6,5,4]),row('20261103',[1,2,3])]}));
 const national={nationalWinRate:1,localWinRate:0,motorTwoWinRate:0,recent50WinRate:0,exhibitionScore:0};
 const local={...national,nationalWinRate:0,localWinRate:1};
 writeFileSync(config,JSON.stringify({trainEndDate:'20261102',baselineWeights:national,candidates:[national,local]}));
 const run=spawnSync(process.execPath,['scripts/run-historical-weight-research.mjs',rows,config],{encoding:'utf8'});
 assert.equal(run.status,1);
 const report=JSON.parse(run.stdout);
 assert.equal(report.evaluationChange.exactTop3,-1);
 assert.equal(report.approvedForDeployment,false);
 console.log('Historical weight CLI regression guard passed');
}finally{rmSync(dir,{recursive:true,force:true});}
