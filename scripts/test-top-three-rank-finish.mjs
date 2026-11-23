// Self-contained regression test for research-only top-three historical diagnostics.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-score-rank-test-'));
try{
 const make=(date,venue,race,leader,finish,gap=4)=>({
  date,venue,race,scoreSource:'current_app_recomputed_after_race',resultVerified:true,
  boats:[1,2,3,4,5,6].map(boat=>({boat,score:boat===leader?100:boat===1&&leader!==1?100-gap:90-boat})),
  officialFinish:finish,capturedAt:null,deadlineAt:null
 });
 const evidence=[
  make('20261120',2,1,5,[1,2,5,3,4,6]),
  make('20261120',2,2,6,[6,1,2,3,4,5]),
  make('20261120',5,3,1,[1,2,3,4,5,6])
 ];
 const input={mode:'retrospective_current_app_diagnostic_not_pre_race_validation',evidence,held:[{key:'held',reason:'unverified'}]};
 const inputPath=path.join(dir,'fixture.json');
 fs.writeFileSync(inputPath,JSON.stringify(input));
 const script=new URL('./report-top-three-rank-finish.mjs',import.meta.url).pathname;
 const run=spawnSync(process.execPath,[script,inputPath],{cwd:dir,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const out=JSON.parse(fs.readFileSync(path.join(dir,'historical-top-three-rank-finish-report.json'),'utf8'));
 assert.equal(out.eligible,3);
 assert.equal(out.held,1);
 assert.equal(out.outerLeaderBreakdown.all.races,2);
 assert.equal(out.outerLeaderBreakdown.all.leaderFinishes['1'],1);
 assert.equal(out.outerLeaderBreakdown.byVenue['2'].races,2);
 assert.equal(out.outerLeaderBreakdown.scoreGapBands['3_to_under_6'].races,2);
 assert.equal(out.venueGroups['5'].races,1);
 assert.equal(out.all.winnerRanks['1'],2);
 assert.equal(out.outerLeaderBreakdown.cases.length,2);
 assert.equal(out.exclusionResearch.first.find(x=>x.rank===1&&x.boat===5).screeningStatus,'insufficient_sample');
 assert.equal(out.exclusionResearch.first.find(x=>x.rank===1&&x.boat===5).hits,0);
 assert.ok(out.exclusionResearch.first.find(x=>x.rank===1&&x.boat===5).upper95>0);
 assert.equal(out.exclusionResearch.topTwo.find(x=>x.rank===1&&x.boat===2).upper95,null);
 assert.equal(out.exclusionResearch.first.length,36);
 assert.equal(out.rankLaneMatrix['1']['5'].races,1);
 assert.equal(out.rankLaneMatrix['1']['5'].first,0);
 assert.equal(out.rankLaneMatrix['1']['5'].topTwo,0);
 assert.equal(out.rankLaneMatrix['1']['6'].races,1);
 assert.equal(out.rankLaneMatrix['1']['6'].first,1);
 assert.equal(out.rankLaneMatrix['1']['6'].topTwo,1);
 assert.equal(out.rankLaneMatrix['1']['6'].outsideTopTwo,0);
 assert.equal(out.rankLaneMatrix['1']['2'].races,0);
 assert.equal(out.rankLaneMatrix['1']['2'].topTwoRate,null);
 assert.equal(Object.values(out.rankLaneMatrix['1']).reduce((sum,x)=>sum+x.races,0),3);
 // Thirty verified misses are still not enough to claim a low 1st-place risk:
 // the Wilson 95% upper bound for 0/30 is about 11.35%.
 const thirty=Array.from({length:30},(_,i)=>make('20261119',2+(i%3),1+Math.floor(i/3)%12,5,[1,2,3,4,5,6]));
 fs.writeFileSync(inputPath,JSON.stringify({...input,evidence:thirty}));
 const runThirty=spawnSync(process.execPath,[script,inputPath],{cwd:dir,encoding:'utf8'});
 assert.equal(runThirty.status,0,runThirty.stderr);
 const outThirty=JSON.parse(fs.readFileSync(path.join(dir,'historical-top-three-rank-finish-report.json'),'utf8'));
 const zeroWins=outThirty.exclusionResearch.first.find(x=>x.rank===1&&x.boat===5);
 assert.equal(zeroWins.races,30);
 assert.equal(zeroWins.hits,0);
 assert.ok(zeroWins.upper95>0.11&&zeroWins.upper95<0.12);
 assert.equal(zeroWins.screeningStatus,'research_candidate');
 // Zero top-two finishes must also remain a candidate, never an automatic exclusion.
 assert.equal(outThirty.exclusionResearch.topTwo.find(x=>x.rank===1&&x.boat===5).screeningStatus,'research_candidate');
 const duplicate={...input,evidence:[evidence[0],evidence[0]]};
 fs.writeFileSync(inputPath,JSON.stringify(duplicate));
 const fail=spawnSync(process.execPath,[script,inputPath],{cwd:dir,encoding:'utf8'});
 assert.notEqual(fail.status,0,'duplicate race should be rejected');
 assert.match(fail.stderr,/Duplicate race/);
 console.log('PASS top-three historical diagnostics: grouped results, outer leaders, venue, score gaps, duplicate guard');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
