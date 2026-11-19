// Offline research-only ranking comparison. Do not use historical after-race stats for live prediction or calibration.
import fs from 'node:fs';
export function compareExploratoryRankingModels(entryReport,resultReport){
 const byResult=new Map((resultReport?.rows??[]).map(r=>[r.date+':'+r.venue+':'+r.race,r]));
 const models=[{name:'winrate_only',w:1,s:0},{name:'average_st_only',w:0,s:1},{name:'equal_winrate_st',w:0.5,s:0.5},{name:'winrate_70_st_30',w:0.7,s:0.3},{name:'winrate_45_st_25_boat_15_normalized',w:0.45,s:0.25,c:0.15}];
 const out=models.map(m=>({model:m.name,eligibleRaces:0,winnerRankOne:0,winnerTopThree:0}));
 for(const e of entryReport?.rows??[]){
  if(e.statsVerified!==true||e.racers?.length!==6||!e.racers.every(r=>Number.isFinite(r.averageWinRate)&&r.averageWinRate>=0&&r.averageWinRate<=10&&Number.isFinite(r.averageST)&&r.averageST>=0&&r.averageST<=1))continue;
  const res=byResult.get(e.date+':'+e.venue+':'+e.race);
  if(res?.status!=='parsed_needs_independent_review'||res.racers?.length!==6)continue;
  const finish=new Map(res.racers.map(r=>[r.boat,r]));
  if(finish.size!==6||new Set(e.racers.map(r=>r.racerId)).size!==6||new Set(res.racers.map(r=>r.racerId)).size!==6||e.racers.some(r=>finish.get(r.boat)?.racerId!==r.racerId))continue;
  if(res.racers.filter(r=>r.finish===1).length!==1)continue;
  const winRates=e.racers.map(r=>r.averageWinRate),sts=e.racers.map(r=>r.averageST);
  const norm=(v,values,reverse=false)=>{const lo=Math.min(...values),hi=Math.max(...values);return hi===lo?0.5:reverse?(hi-v)/(hi-lo):(v-lo)/(hi-lo)};
  for(let i=0;i<models.length;i++){
   const m=models[i],row=out[i];
   const ranked=e.racers.map(r=>({boat:r.boat,score:m.w*norm(r.averageWinRate,winRates)+m.s*norm(r.averageST,sts,true)+(m.c??0)*(7-r.boat)/6})).sort((a,b)=>b.score-a.score||a.boat-b.boat);
   const winnerRank=ranked.findIndex(r=>finish.get(r.boat).finish===1)+1;
   row.eligibleRaces++;row.winnerRankOne+=Number(winnerRank===1);row.winnerTopThree+=Number(winnerRank<=3);
  }
 }
 return {researchOnly:true,eligibleForCalibration:0,warning:'Post-race-retrieved entry stats and unverified results. Boat number is a proxy, NOT verified pre-race entry course. In-sample descriptive model comparison, not prediction accuracy.',models:out};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [entries,results,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: ENTRY_STATS RESULT_FINISHES OUTPUT_JSON');
 const report=compareExploratoryRankingModels(JSON.parse(fs.readFileSync(entries,'utf8')),JSON.parse(fs.readFileSync(results,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
