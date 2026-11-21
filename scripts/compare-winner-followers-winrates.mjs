// Research-only comparison of observed second/third finishes against pre-race win-rate ranking.
// Never use observed winner as an input to a claimed pre-race winner prediction.
export function compareWinnerFollowersWithWinRates(records=[]){
 const out={total:records.length,eligible:0,held:0,byWinner:{}};
 for(const record of records){
  const finish=record?.finishOrder,rows=record?.preRaceWinRates;
  const validFinish=Array.isArray(finish)&&finish.length===6&&new Set(finish).size===6&&finish.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
  const validRows=Array.isArray(rows)&&rows.length===6&&new Set(rows.map(x=>x.boat)).size===6&&rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.nationalWinRate)&&x.nationalWinRate>=0&&x.nationalWinRate<=10);
  // Require explicitly independently authenticated pre-race rates; a post-race lookup is not sufficient.
  if(record?.resultVerified!==true||record?.preRaceWinRatesAuthenticated!==true||!validFinish||!validRows){out.held++;continue;}
  const [winner,second,third]=finish;
  const remaining=rows.filter(x=>x.boat!==winner).sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
  const rankSecond=remaining.findIndex(x=>x.boat===second)+1;
  const rankThird=remaining.findIndex(x=>x.boat===third)+1;
  const group=out.byWinner[winner]??={races:0,topRemainingSecond:0,topTwoRemainingPodium:0,secondWinRateRankCounts:[0,0,0,0,0],thirdWinRateRankCounts:[0,0,0,0,0]};
  group.races++;
  group.secondWinRateRankCounts[rankSecond-1]++;
  group.thirdWinRateRankCounts[rankThird-1]++;
  if(rankSecond===1)group.topRemainingSecond++;
  if(remaining.slice(0,2).some(x=>x.boat===second||x.boat===third))group.topTwoRemainingPodium++;
  out.eligible++;
 }
 return {...out,interpretation:'conditional_on_actual_winner_retrospective_only_not_pre_race_accuracy',scoringChanged:false};
}
