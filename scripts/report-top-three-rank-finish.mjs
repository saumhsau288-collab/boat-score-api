// Research only: all verified retrospective races, not only boat 1 leaders.
// Usage: node scripts/report-top-three-rank-finish.mjs retrospective-exclusion-*.json
import fs from 'node:fs';
const paths=process.argv.slice(2);
if(!paths.length)throw Error('Provide retrospective evidence JSON');
const seen=new Set(),rows=[],held=[];
for(const path of paths){
 const data=JSON.parse(fs.readFileSync(path,'utf8'));
 if(data.mode!=='retrospective_current_app_diagnostic_not_pre_race_validation')throw Error('Invalid mode: '+path);
 for(const e of data.evidence||[]){
  const key=[e.date,e.venue,e.race].join(':');
  if(seen.has(key))throw Error('Duplicate race: '+key);
  seen.add(key);
  const boats=e.boats,finish=e.officialFinish;
  if(e.scoreSource!=='current_app_recomputed_after_race'||e.resultVerified!==true||
   !Array.isArray(boats)||boats.length!==6||new Set(boats.map(x=>x.boat)).size!==6||
   !boats.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))||
   !Array.isArray(finish)||finish.length!==6||new Set(finish).size!==6||
   !finish.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){
   held.push({key,reason:'invalid_evidence'});continue;
  }
  const ranked=[...boats].sort((a,b)=>b.score-a.score||a.boat-b.boat);
  const order=ranked.map(x=>x.boat);
  const finishRanks=finish.map(x=>order.indexOf(x)+1);
  rows.push({key,venue:e.venue,leaderBoat:order[0],scoreGap:ranked[0].score-ranked[1].score,
   predictedRankOrder:order,actualTopThree:finish.slice(0,3),actualTopThreeRanks:finishRanks.slice(0,3),
   leaderFinish:finish.indexOf(order[0])+1,
   topThreeWinner:finishRanks[0]<=3,
   topThreeTopTwo:finishRanks.slice(0,2).every(x=>x<=3),
   topThreePodium:finishRanks.slice(0,3).every(x=>x<=3),
   topTwoExact:finishRanks[0]===1&&finishRanks[1]===2,
   topTwoAnyOrder:finishRanks.slice(0,2).every(x=>x<=2)});
 }
 for(const h of data.held||[])held.push({key:h.key,reason:h.reason||'source_held'});
}
function summarize(items){
 const n=items.length;
 const leaderFinishes=Object.fromEntries([1,2,3,4,5,6].map(k=>[k,items.filter(x=>x.leaderFinish===k).length]));
 const winnerRanks=Object.fromEntries([1,2,3,4,5,6].map(k=>[k,items.filter(x=>x.actualTopThreeRanks[0]===k).length]));
 const runnerUpRanks=Object.fromEntries([1,2,3,4,5,6].map(k=>[k,items.filter(x=>x.actualTopThreeRanks[1]===k).length]));
 const counts=Object.fromEntries(['topThreeWinner','topThreeTopTwo','topThreePodium','topTwoExact','topTwoAnyOrder'].map(k=>[k,items.filter(x=>x[k]).length]));
 return {races:n,leaderFinishes,winnerRanks,runnerUpRanks,counts,rates:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,n?v/n:null]))};
}
const leaderGroups=Object.fromEntries([1,2,3,4,5,6].map(boat=>['leader_boat_'+boat,summarize(rows.filter(x=>x.leaderBoat===boat))]));
const gapBands=Object.fromEntries([
 ['under_3',0,3],['3_to_under_6',3,6],['6_to_under_12',6,12],
 ['12_to_under_20',12,20],['20_plus',20,Infinity]
].map(([name,min,max])=>[name,summarize(rows.filter(x=>x.scoreGap>=min&&x.scoreGap<max))]));
// Never equate a historical non-win with a safe exclusion rule.
const outerLeaders=rows.filter(x=>x.leaderBoat>=5);
const outerLeaderBreakdown={
 all:summarize(outerLeaders),
 byVenue:Object.fromEntries([...new Set(outerLeaders.map(x=>x.venue))].sort((a,b)=>a-b).map(v=>[v,summarize(outerLeaders.filter(x=>x.venue===v))])),
 scoreGapBands:Object.fromEntries([
  ['under_3',0,3],['3_to_under_6',3,6],['6_to_under_12',6,12],
  ['12_to_under_20',12,20],['20_plus',20,Infinity]
 ].map(([name,min,max])=>[name,summarize(outerLeaders.filter(x=>x.scoreGap>=min&&x.scoreGap<max))])),
 cases:outerLeaders.map(x=>({key:x.key,venue:x.venue,leaderBoat:x.leaderBoat,scoreGap:x.scoreGap,
  leaderFinish:x.leaderFinish,actualTopThree:x.actualTopThree,actualTopThreeRanks:x.actualTopThreeRanks})),
 caution:'Observed zero outer-leader wins in a small post-hoc sample is not proof of zero win probability or a justified exclusion.'
};
const venueGroups=Object.fromEntries([...new Set(rows.map(x=>x.venue))].sort((a,b)=>a-b).map(v=>[v,summarize(rows.filter(x=>x.venue===v))]));
const output={mode:'retrospective_top_three_rank_finish_diagnostic',sourceFiles:paths,
 eligible:rows.length,held:held.length,all:summarize(rows),leaderGroups,gapBands,venueGroups,outerLeaderBreakdown,details:rows,heldDetails:held,
 note:'All scores recomputed after racing. This is not pre-race accuracy. Winner/runner-up ranks are positions in recomputed score order; topThreeTopTwo means both actual first and second were among the three highest-scored racers. No odds, ST, motor or exhibition inputs are present in this evidence.'};
fs.writeFileSync('historical-top-three-rank-finish-report.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({file:'historical-top-three-rank-finish-report.json',eligible:output.eligible,held:output.held,all:output.all,leaderGroups:output.leaderGroups,gapBands:output.gapBands,venueGroups:output.venueGroups,outerLeaderBreakdown:output.outerLeaderBreakdown},null,2));
