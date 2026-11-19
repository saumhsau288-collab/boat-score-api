// Descriptive post-race study only: do not call these saved-after-race stats a pre-race backtest.
import fs from 'node:fs';
export function compareExploratoryWinRateFinishes(entryReport,resultReport){
 const byRace=new Map((resultReport.rows||[]).map(r=>[r.date+':'+r.venue+':'+r.race,r]));
 const rows=[];
 for(const entry of entryReport.rows||[]){
  if(entry.statsVerified!==true||entry.racers?.length!==6)continue;
  const result=byRace.get(entry.date+':'+entry.venue+':'+entry.race);
  if(!result||result.status!=='parsed_needs_independent_review'||result.racers?.length!==6)continue;
  const finishes=new Map(result.racers.map(r=>[r.boat,r]));
  if(entry.racers.some(r=>finishes.get(r.boat)?.racerId!==r.racerId))continue;
  const joined=entry.racers.map(r=>({...r,finish:finishes.get(r.boat).finish}));
  const ranked=[...joined].sort((a,b)=>b.averageWinRate-a.averageWinRate||a.boat-b.boat);
  rows.push({race:entry.race,highestAverageWinRateBoat:ranked[0].boat,
   highestAverageWinRateFinish:ranked[0].finish,
   highestAverageWinRateWon:ranked[0].finish===1,
   winnerBoat:joined.find(r=>r.finish===1)?.boat??null,
   winnerAverageWinRate:joined.find(r=>r.finish===1)?.averageWinRate??null,
   racerStats:ranked.map(r=>({boat:r.boat,racerId:r.racerId,averageWinRate:r.averageWinRate,finish:r.finish})),
   exploratoryOnly:true,eligibleForCalibration:false});
 }
 return {matchedRaces:rows.length,highestWinRateRacerWon:rows.filter(r=>r.highestAverageWinRateWon).length,
  eligibleForCalibration:0,warning:'Stats fetched after the race; results not independently confirmed. Descriptive only.',rows};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [entries,results,output]=process.argv.slice(2);
 const report=compareExploratoryWinRateFinishes(JSON.parse(fs.readFileSync(entries,'utf8')),JSON.parse(fs.readFileSync(results,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({matchedRaces:report.matchedRaces,highestWinRateRacerWon:report.highestWinRateRacerWon,eligibleForCalibration:0,rows:report.rows.map(r=>({race:r.race,highestAverageWinRateBoat:r.highestAverageWinRateBoat,highestAverageWinRateFinish:r.highestAverageWinRateFinish,winnerBoat:r.winnerBoat}))}));
}
