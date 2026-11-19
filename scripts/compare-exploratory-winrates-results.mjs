// Descriptive post-race study only: do not call these saved-after-race stats a pre-race backtest.
import fs from 'node:fs';
export function compareExploratoryWinRateFinishes(entryReport,resultReport){
 const resultRows=Array.isArray(resultReport?.rows)?resultReport.rows:[];
 const keys=resultRows.map(r=>r.date+':'+r.venue+':'+r.race);
 if(new Set(keys).size!==keys.length)throw Error('Duplicate result race identity');
 const byRace=new Map(resultRows.map(r=>[r.date+':'+r.venue+':'+r.race,r]));
 const entryRows=Array.isArray(entryReport?.rows)?entryReport.rows:[];
 const entryKeys=entryRows.map(r=>r.date+':'+r.venue+':'+r.race);
 if(new Set(entryKeys).size!==entryKeys.length)throw Error('Duplicate entry race identity');
 const rows=[];
 for(const entry of entryRows){
  if(entry.statsVerified!==true||entry.racers?.length!==6)continue;
  const result=byRace.get(entry.date+':'+entry.venue+':'+entry.race);
  if(!result||result.status!=='parsed_needs_independent_review'||result.racers?.length!==6)continue;
  const finishes=new Map(result.racers.map(r=>[r.boat,r]));
  if(finishes.size!==6||new Set(result.racers.map(r=>r.racerId)).size!==6||new Set(entry.racers.map(r=>r.racerId)).size!==6)continue;
  if(entry.racers.some(r=>!Number.isFinite(r.averageWinRate)||r.averageWinRate<0||r.averageWinRate>10))continue;
  if(entry.racers.some(r=>finishes.get(r.boat)?.racerId!==r.racerId))continue;
  const joined=entry.racers.map(r=>({...r,finish:finishes.get(r.boat).finish,actualEntryCourse:finishes.get(r.boat).actualEntryCourse}));
  const ranked=[...joined].sort((a,b)=>b.averageWinRate-a.averageWinRate||a.boat-b.boat);
  rows.push({race:entry.race,highestAverageWinRateBoat:ranked[0].boat,
   highestAverageWinRateFinish:ranked[0].finish,
   highestAverageWinRateWon:ranked[0].finish===1,
   highestAverageWinRatePodium:Number.isInteger(ranked[0].finish)&&ranked[0].finish<=3,
   highestAverageWinRateBoatInside:ranked[0].boat<=3,
   highestAverageWinRateActualCourse:Number.isInteger(ranked[0].actualEntryCourse)?ranked[0].actualEntryCourse:null,
   highestAverageWinRateActualCourseInside:Number.isInteger(ranked[0].actualEntryCourse)?ranked[0].actualEntryCourse<=3:null,
   topWinRateAverageST:ranked[0].averageST??null,
   winnerAverageST:joined.find(r=>r.finish===1)?.averageST??null,
   winnerBoat:joined.find(r=>r.finish===1)?.boat??null,
   winnerAverageWinRate:joined.find(r=>r.finish===1)?.averageWinRate??null,
   racerStats:ranked.map(r=>({boat:r.boat,racerId:r.racerId,averageWinRate:r.averageWinRate,finish:r.finish})),
   exploratoryOnly:true,eligibleForCalibration:false});
 }
 return {matchedRaces:rows.length,highestWinRateRacerWon:rows.filter(r=>r.highestAverageWinRateWon).length,
  highestWinRateRacerPodium:rows.filter(r=>r.highestAverageWinRatePodium).length,
  topWinRateActualInside:{races:rows.filter(r=>r.highestAverageWinRateActualCourseInside===true).length,wins:rows.filter(r=>r.highestAverageWinRateActualCourseInside===true&&r.highestAverageWinRateWon).length,podiums:rows.filter(r=>r.highestAverageWinRateActualCourseInside===true&&r.highestAverageWinRatePodium).length},
  topWinRateActualOutside:{races:rows.filter(r=>r.highestAverageWinRateActualCourseInside===false).length,wins:rows.filter(r=>r.highestAverageWinRateActualCourseInside===false&&r.highestAverageWinRateWon).length,podiums:rows.filter(r=>r.highestAverageWinRateActualCourseInside===false&&r.highestAverageWinRatePodium).length},
  topWinRateInside:{races:rows.filter(r=>r.highestAverageWinRateBoatInside).length,wins:rows.filter(r=>r.highestAverageWinRateBoatInside&&r.highestAverageWinRateWon).length,podiums:rows.filter(r=>r.highestAverageWinRateBoatInside&&r.highestAverageWinRatePodium).length},
  topWinRateOutside:{races:rows.filter(r=>!r.highestAverageWinRateBoatInside).length,wins:rows.filter(r=>!r.highestAverageWinRateBoatInside&&r.highestAverageWinRateWon).length,podiums:rows.filter(r=>!r.highestAverageWinRateBoatInside&&r.highestAverageWinRatePodium).length},
  eligibleForCalibration:0,warning:'Stats fetched after the race; results not independently confirmed. Descriptive only.',rows};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [entries,results,output]=process.argv.slice(2);
 const report=compareExploratoryWinRateFinishes(JSON.parse(fs.readFileSync(entries,'utf8')),JSON.parse(fs.readFileSync(results,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({matchedRaces:report.matchedRaces,highestWinRateRacerWon:report.highestWinRateRacerWon,highestWinRateRacerPodium:report.highestWinRateRacerPodium,topWinRateActualInside:report.topWinRateActualInside,topWinRateActualOutside:report.topWinRateActualOutside,topWinRateInside:report.topWinRateInside,topWinRateOutside:report.topWinRateOutside,eligibleForCalibration:0,rows:report.rows.map(r=>({race:r.race,highestAverageWinRateBoat:r.highestAverageWinRateBoat,highestAverageWinRateFinish:r.highestAverageWinRateFinish,winnerBoat:r.winnerBoat}))}));
}
