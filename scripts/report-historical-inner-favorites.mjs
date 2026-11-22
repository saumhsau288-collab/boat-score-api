// Retrospective research only: inner-side high-score racers vs verified historical finishes.
// Usage: node scripts/report-historical-inner-favorites.mjs retrospective-exclusion-*.json
// Recomputed historical scores are not immutable pre-race predictions.
import fs from 'node:fs';
const paths=process.argv.slice(2);
if(!paths.length)throw Error('Provide retrospective-exclusion JSON files');
const groups=new Map(),details=[],seen=new Set(),held=[];
function add(group,row){
 const g=groups.get(group)||{races:0,topScoreWinner:0,topTwoExact:0,topTwoAnyOrder:0,innerWinner:0,innerTopTwoFinish:0};
 g.races++;
 if(row.topScoreWinner)g.topScoreWinner++;
 if(row.topTwoExact)g.topTwoExact++;
 if(row.topTwoAnyOrder)g.topTwoAnyOrder++;
 if(row.innerWinner)g.innerWinner++;
 if(row.innerTopTwoFinish)g.innerTopTwoFinish++;
 groups.set(group,g);
}
for(const path of paths){
 const data=JSON.parse(fs.readFileSync(path,'utf8'));
 if(data.mode!=='retrospective_current_app_diagnostic_not_pre_race_validation')throw Error('Unexpected evidence mode: '+path);
 for(const e of data.evidence||[]){
  const key=[e.date,e.venue,e.race].join(':');
  if(seen.has(key))throw Error('Duplicate race: '+key);
  seen.add(key);
  const boats=e.boats,finish=e.officialFinish;
  if(e.resultVerified!==true||!Array.isArray(boats)||boats.length!==6||new Set(boats.map(x=>x.boat)).size!==6||
    !boats.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))||
    !Array.isArray(finish)||finish.length!==6||new Set(finish).size!==6||
    !finish.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){
   held.push({key,reason:'unverified_scores_or_finish'});continue;
  }
  const order=[...boats].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
  const innerTopTwoCount=order.slice(0,2).filter(x=>x<=3).length;
  const innerScores=boats.filter(x=>x.boat<=3).map(x=>x.score).sort((a,b)=>b-a);
  const outerMax=Math.max(...boats.filter(x=>x.boat>=4).map(x=>x.score));
  const highInnerPair=innerTopTwoCount===2&&innerScores[1]>outerMax;
  const row={key,order,actual:finish.slice(0,3),innerTopTwoCount,highInnerPair,
    topScoreWinner:order[0]===finish[0],
    topTwoExact:order[0]===finish[0]&&order[1]===finish[1],
    topTwoAnyOrder:new Set(order.slice(0,2)).size===2&&order.slice(0,2).every(x=>finish.slice(0,2).includes(x)),
    innerWinner:finish[0]<=3,innerTopTwoFinish:finish[0]<=3&&finish[1]<=3};
  details.push(row);
  for(const group of ['all','inner_top2_count_'+innerTopTwoCount,
    highInnerPair?'inner_pair_above_all_outer':'not_inner_pair_above_all_outer',
    'score_leader_'+(order[0]<=3?'inner':'outer')])add(group,row);
 }
 for(const h of data.held||[])held.push({key:h.key,reason:h.reason||'source_held'});
}
const stats=Object.fromEntries([...groups].map(([key,g])=>[key,{...g,
 topScoreWinnerRate:g.races?g.topScoreWinner/g.races:null,
 topTwoExactRate:g.races?g.topTwoExact/g.races:null,
 topTwoAnyOrderRate:g.races?g.topTwoAnyOrder/g.races:null}]));
const report={mode:'retrospective_recomputed_scores_not_prerace_accuracy',eligible:details.length,held:held.length,
 caveat:'Current scoring applied to historical pages may use revised information. These group rates are descriptive, not prospective hit rates; do not optimize weights using the same races.',
 stats,details,held};
const file='historical-inner-favorites-report.json';
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file,eligible:report.eligible,held:report.held,stats},null,2));
