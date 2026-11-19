// Descriptive research only. Archived pages retrieved after the races are NOT a valid backtest.
import fs from 'node:fs';
import {experimentalRaceRanking} from '../boat-score-2-racer-experiment.js';
export function evaluateArchivedJoinedRaces(report){
 if(!Array.isArray(report?.rows))throw Error('Expected joined rows');
 const rows=report.rows.map(r=>{
  const base={date:r.date,venue:r.venue,race:r.race,status:'not_evaluated',eligibleForWeightTuning:false};
  if(r.status!=='research_only_joined_postrace_archive')return base;
  const ranked=experimentalRaceRanking(r.racers);
  if(ranked.status!=='evaluated')return {...base,status:'invalid_features'};
  const actual=r.racers.filter(x=>Number.isInteger(x.finish)).sort((a,b)=>a.finish-b.finish).map(x=>x.boat);
  const predicted=ranked.ranked.map(x=>x.boat);
  const podium=actual.slice(0,3);
  if(actual.length!==6||new Set(actual).size!==6)return {...base,status:'incomplete_finish'};
  return {...base,status:'descriptive_comparison_only',predicted,actual,topOneMatch:predicted[0]===actual[0],
   podiumOverlap:predicted.slice(0,3).filter(x=>podium.includes(x)).length,
   exactTopThree:predicted.slice(0,3).every((x,i)=>x===actual[i]),
   racerScores:ranked.ranked.map(x=>({boat:x.boat,score:x.score,components:x.components}))};
 });
 const done=rows.filter(x=>x.status==='descriptive_comparison_only');
 return {method:'postrace_descriptive_score_comparison_not_backtest',targets:rows.length,compared:done.length,
  topOneMatches:done.filter(x=>x.topOneMatch).length,
  exactTopThreeMatches:done.filter(x=>x.exactTopThree).length,
  totalPodiumOverlap:done.reduce((n,x)=>n+x.podiumOverlap,0),
  eligibleForWeightTuning:0,rows,
  warning:'Post-race archival features are not authenticated pre-cutoff snapshots; these counts cannot justify changing predictive weights.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: joined.json report.json');
 const report=evaluateArchivedJoinedRaces(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({targets:report.targets,compared:report.compared,topOneMatches:report.topOneMatches,exactTopThreeMatches:report.exactTopThreeMatches,eligibleForWeightTuning:0}));
}
