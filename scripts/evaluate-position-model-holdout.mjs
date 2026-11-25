import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Chronological out-of-sample test. Laplace smoothing avoids zero cells.
// Not prospective validation: archived rates may not be genuine pre-race snapshots.
export function evaluatePositionModelHoldout(reports){
 if(!Array.isArray(reports)||reports.length<3)throw TypeError('three or more daily reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(days.some((d,i)=>i>0&&String(d.date)===String(days[i-1].date)))throw new Error('duplicate evaluation date');
 // Frozen six-day training period: adding new archive days must NEVER retrain this model.
 const trainingEnd='20261117';
 if(days.some(d=>!/^20\d{6}$/.test(String(d.date))))throw new Error('invalid evaluation date');
 const split=days.findIndex(d=>String(d.date)>trainingEnd);
 if(split<0||split<1||days.slice(0,split).some(d=>String(d.date)<'20261112'))throw new Error('frozen training dates 20261112–20261117 and later evaluation dates required');
 if(days.slice(0,split).map(d=>String(d.date)).join(',')!=='20261112,20261113,20261114,20261115,20261116,20261117')throw new Error('frozen six-day training set incomplete or changed');
 const flatten=ds=>ds.flatMap(d=>d.reports.flatMap(v=>v.records));
 const prepare=rows=>rows.flatMap(r=>{
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers)}catch{return []}
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6))return [];
  if(ranked.some((x,i)=>i>0&&x.score===ranked[i-1].score))return [];
  return [{ranked,o}];
 });
 const train=prepare(flatten(days.slice(0,split))),holdout=days.slice(split).flatMap(day=>prepare(flatten([day])).map(row=>({...row,date:String(day.date)})));
 const cells=Array.from({length:6},()=>Array.from({length:6},()=>[1,1,1,1,1,1]));
 for(const {ranked,o} of train)for(let i=0;i<6;i++)cells[ranked[i].boat-1][i][o.indexOf(ranked[i].boat)]++;
 const predict=(ranked,forcedWinner=null)=>{
  const probabilities=Object.fromEntries(ranked.map((x,i)=>{const c=cells[x.boat-1][i],sum=c.reduce((a,b)=>a+b,0);return [x.boat,c.slice(0,3).map(v=>v/sum)]}));
  let best=null,bestScore=-1;
  for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
   if(a===b||a===c||b===c||(forcedWinner!==null&&a!==forcedWinner))continue;
   const score=probabilities[a][0]*probabilities[b][1]*probabilities[c][2];
   if(score>bestScore){bestScore=score;best=[a,b,c]}
  }
  return best;
 };
 const byDate={};
 const outsideWinnerCandidate={races:0,otherWins:0,highestOtherWins:0,byBoat:{},actualOtherWinnerByBoat:Object.fromEntries(Array.from({length:5},(_,i)=>[String(i+2),0]))};
 const futureIndependent={startDate:'20261122',races:0,switchedRaces:0,originalWinnerCorrect:0,hybridWinnerCorrect:0,originalExact:0,hybridExact:0,fixed123Exact:0,byDate:{},status:'NO_NEW_DATES'};
 const hybridTrifecta={races:0,hybridExact:0,originalExact:0,fixed123Exact:0,hybridOnlyVsOriginal:0,originalOnlyVsHybrid:0,switchedRaces:0,originalWinnerCorrect:0,hybridWinnerCorrect:0,byPredictedWinner:Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,exact:0}])),byDate:{}};
 const challengerGapTwoPlusTrifecta={races:0,challengerWins:0,challengerTop3:0,oneTop3:0,challengerFirstModelExact:0,forcedWinnerExact:0,originalModelExact:0,fixed123Exact:0,forcedOnlyVsOriginal:0,originalOnlyVsForced:0};
 const challengerGapTwoPlusByDate={};
 const challengerGapTwoPlus={inner234:{races:0,challengerWins:0,oneWins:0},outer56:{races:0,challengerWins:0,oneWins:0}};
 const otherLeadGap=Object.fromEntries(['under1','1to2','2plus'].map(k=>[k,{races:0,oneWins:0,bestOtherWins:0,otherWins:0,byBestOtherBoat:Object.fromEntries(Array.from({length:5},(_,i)=>[String(i+2),{races:0,wins:0}]))}]));
 const candidateStrategies={weakOneRaces:0,alwaysOneWins:0,alwaysTwoWins:0,bestOtherWins:0,boatTwoOrBestOtherWins:0};
 const byBoatOneRank=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,boatOneWins:0,otherWins:0,modelExact:0}]));
 const byActualWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,modelExact:0,fixed123Exact:0,rankExact:0}]));
 const byPredictedWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,modelExact:0,fixed123Exact:0,rankExact:0}]));
 const counts={races:0,modelExact:0,fixed123Exact:0,rankExact:0,modelOnlyVsFixed:0,fixedOnlyVsModel:0,modelOnlyVsRank:0,rankOnlyVsModel:0};
 for(const {ranked,o,date} of holdout){
  const model=predict(ranked),rank=ranked.slice(0,3).map(x=>x.boat),actual=o.slice(0,3);
  const exact=x=>x.every((n,i)=>n===actual[i]);
  const m=exact(model),f=exact([1,2,3]),r=exact(rank);
  const one=ranked.find(x=>x.boat===1),bestOther=ranked.find(x=>x.boat!==1);
  const switchWinner=ranked.findIndex(x=>x.boat===1)>=3&&bestOther.boat<=4&&bestOther.score-one.score>=2;
  const hybrid=switchWinner?predict(ranked,bestOther.boat):model;
  const h=exact(hybrid);
  hybridTrifecta.originalWinnerCorrect+=model[0]===actual[0]?1:0;
  hybridTrifecta.hybridWinnerCorrect+=hybrid[0]===actual[0]?1:0;
  const winnerGroup=hybridTrifecta.byPredictedWinner[String(hybrid[0])];winnerGroup.races++;winnerGroup.exact+=h?1:0;
  hybridTrifecta.races++;hybridTrifecta.hybridExact+=h?1:0;hybridTrifecta.originalExact+=m?1:0;hybridTrifecta.fixed123Exact+=f?1:0;hybridTrifecta.switchedRaces+=switchWinner?1:0;
  hybridTrifecta.hybridOnlyVsOriginal+=h&&!m?1:0;hybridTrifecta.originalOnlyVsHybrid+=m&&!h?1:0;
  if(date>=futureIndependent.startDate){
   futureIndependent.races++;
   futureIndependent.switchedRaces+=switchWinner?1:0;
   futureIndependent.originalWinnerCorrect+=model[0]===actual[0]?1:0;
   futureIndependent.hybridWinnerCorrect+=hybrid[0]===actual[0]?1:0;
   futureIndependent.originalExact+=m?1:0;
   futureIndependent.hybridExact+=h?1:0;
   futureIndependent.fixed123Exact+=f?1:0;
   const d=futureIndependent.byDate[date]??={races:0,switchedRaces:0,originalExact:0,hybridExact:0};
   d.races++;d.switchedRaces+=switchWinner?1:0;d.originalExact+=m?1:0;d.hybridExact+=h?1:0;
   futureIndependent.status='RETROSPECTIVE_ARCHIVE_ONLY';
  }
  const hybridDay=hybridTrifecta.byDate[date]??={races:0,switchedRaces:0,hybridExact:0,originalExact:0,fixed123Exact:0,originalWinnerCorrect:0,hybridWinnerCorrect:0,switchedWinnerCorrect:0};
  hybridDay.originalWinnerCorrect+=model[0]===actual[0]?1:0;
  hybridDay.hybridWinnerCorrect+=hybrid[0]===actual[0]?1:0;
  hybridDay.switchedWinnerCorrect+=switchWinner&&hybrid[0]===actual[0]?1:0;
  hybridDay.races++;hybridDay.switchedRaces+=switchWinner?1:0;hybridDay.hybridExact+=h?1:0;hybridDay.originalExact+=m?1:0;hybridDay.fixed123Exact+=f?1:0;
  counts.races++;counts.modelExact+=m?1:0;counts.fixed123Exact+=f?1:0;counts.rankExact+=r?1:0;
  const boatOneRank=ranked.findIndex(x=>x.boat===1)+1;
  if(boatOneRank>=4){
   outsideWinnerCandidate.races++;
   candidateStrategies.weakOneRaces++;
   candidateStrategies.alwaysOneWins+=actual[0]===1?1:0;
   candidateStrategies.alwaysTwoWins+=actual[0]===2?1:0;
   const bestOther=ranked.find(x=>x.boat!==1).boat;
   const otherWin=actual[0]!==1;
   const gap=ranked.find(x=>x.boat===bestOther).score-ranked.find(x=>x.boat===1).score;
   const gapBand=otherLeadGap[gap>=2?'2plus':gap>=1?'1to2':'under1'];
   if(gap>=2){
    const group=bestOther<=4?'inner234':'outer56';
    if(group==='inner234'){
     challengerGapTwoPlusTrifecta.races++;
     challengerGapTwoPlusTrifecta.challengerWins+=actual[0]===bestOther?1:0;
     challengerGapTwoPlusTrifecta.challengerTop3+=actual.includes(bestOther)?1:0;
     challengerGapTwoPlusTrifecta.oneTop3+=actual.includes(1)?1:0;
     const forced=predict(ranked,bestOther);
     challengerGapTwoPlusTrifecta.forcedWinnerExact+=exact(forced)?1:0;
     challengerGapTwoPlusTrifecta.originalModelExact+=m?1:0;
     challengerGapTwoPlusTrifecta.fixed123Exact+=f?1:0;
     challengerGapTwoPlusTrifecta.forcedOnlyVsOriginal+=exact(forced)&&!m?1:0;
     challengerGapTwoPlusTrifecta.originalOnlyVsForced+=m&&!exact(forced)?1:0;
     const challengerOrder=[bestOther,...model.filter(b=>b!==bestOther)].slice(0,3);
     challengerGapTwoPlusTrifecta.challengerFirstModelExact+=challengerOrder.every((b,i)=>b===actual[i])?1:0;
    }
    const target=challengerGapTwoPlus[group];target.races++;target.challengerWins+=actual[0]===bestOther?1:0;target.oneWins+=actual[0]===1?1:0;
    const day=challengerGapTwoPlusByDate[date]??={inner234:{races:0,challengerWins:0,oneWins:0},outer56:{races:0,challengerWins:0,oneWins:0}};
    const d=day[group];d.races++;d.challengerWins+=actual[0]===bestOther?1:0;d.oneWins+=actual[0]===1?1:0;
   }
   gapBand.races++;gapBand.oneWins+=actual[0]===1?1:0;gapBand.otherWins+=otherWin?1:0;gapBand.bestOtherWins+=actual[0]===bestOther?1:0;
   gapBand.byBestOtherBoat[String(bestOther)].races++;gapBand.byBestOtherBoat[String(bestOther)].wins+=actual[0]===bestOther?1:0;
   outsideWinnerCandidate.otherWins+=otherWin?1:0;
   if(otherWin)outsideWinnerCandidate.actualOtherWinnerByBoat[String(actual[0])]++;
   outsideWinnerCandidate.highestOtherWins+=actual[0]===bestOther?1:0;
   candidateStrategies.bestOtherWins+=actual[0]===bestOther?1:0;
   candidateStrategies.boatTwoOrBestOtherWins+=actual[0]===(bestOther<=3?bestOther:2)?1:0;
   const cell=outsideWinnerCandidate.byBoat[String(bestOther)]??={selected:0,wins:0};cell.selected++;cell.wins+=actual[0]===bestOther?1:0;
  }
  const rankGroup=byBoatOneRank[String(boatOneRank)];rankGroup.races++;rankGroup.boatOneWins+=actual[0]===1?1:0;rankGroup.otherWins+=actual[0]!==1?1:0;rankGroup.modelExact+=m?1:0;
  const actualWinner=byActualWinner[String(actual[0])];actualWinner.races++;actualWinner.modelExact+=m?1:0;actualWinner.fixed123Exact+=f?1:0;actualWinner.rankExact+=r?1:0;
  const winner=byPredictedWinner[String(model[0])];winner.races++;winner.modelExact+=m?1:0;winner.fixed123Exact+=f?1:0;winner.rankExact+=r?1:0;
  const day=byDate[date]??={races:0,modelExact:0,fixed123Exact:0,rankExact:0};day.races++;day.modelExact+=m?1:0;day.fixed123Exact+=f?1:0;day.rankExact+=r?1:0;
  counts.modelOnlyVsFixed+=m&&!f?1:0;counts.fixedOnlyVsModel+=f&&!m?1:0;
  counts.modelOnlyVsRank+=m&&!r?1:0;counts.rankOnlyVsModel+=r&&!m?1:0;
 }
 return {trainingDates:days.slice(0,split).map(d=>d.date),holdoutDates:days.slice(split).map(d=>d.date),trainingRaces:train.length,holdout:counts,byDate,byPredictedWinner,byActualWinner,byBoatOneRank,outsideWinnerCandidate,candidateStrategies,otherLeadGap,challengerGapTwoPlus,challengerGapTwoPlusByDate,challengerGapTwoPlusTrifecta,hybridTrifecta,futureIndependent,frozenTrainingEnd:trainingEnd,independentFutureDates:days.slice(split).filter(d=>String(d.date)>='20261122').map(d=>String(d.date)),warning:'Research only. Independent per-position probabilities multiplied without joint calibration; actual entry course and genuine pre-race rates not verified. Do not deploy or claim prospective accuracy.'};
}
