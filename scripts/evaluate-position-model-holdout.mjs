import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Chronological out-of-sample test. Laplace smoothing avoids zero cells.
// Not prospective validation: archived rates may not be genuine pre-race snapshots.
export function evaluatePositionModelHoldout(reports){
 if(!Array.isArray(reports)||reports.length<3)throw TypeError('three or more daily reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const split=Math.ceil(days.length*.6);
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
 const predict=ranked=>{
  const probabilities=Object.fromEntries(ranked.map((x,i)=>{const c=cells[x.boat-1][i],sum=c.reduce((a,b)=>a+b,0);return [x.boat,c.slice(0,3).map(v=>v/sum)]}));
  let best=null,bestScore=-1;
  for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
   if(a===b||a===c||b===c)continue;
   const score=probabilities[a][0]*probabilities[b][1]*probabilities[c][2];
   if(score>bestScore){bestScore=score;best=[a,b,c]}
  }
  return best;
 };
 const byDate={};
 const byActualWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,modelExact:0,fixed123Exact:0,rankExact:0}]));
 const byPredictedWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,modelExact:0,fixed123Exact:0,rankExact:0}]));
 const counts={races:0,modelExact:0,fixed123Exact:0,rankExact:0,modelOnlyVsFixed:0,fixedOnlyVsModel:0,modelOnlyVsRank:0,rankOnlyVsModel:0};
 for(const {ranked,o,date} of holdout){
  const model=predict(ranked),rank=ranked.slice(0,3).map(x=>x.boat),actual=o.slice(0,3);
  const exact=x=>x.every((n,i)=>n===actual[i]);
  const m=exact(model),f=exact([1,2,3]),r=exact(rank);
  counts.races++;counts.modelExact+=m?1:0;counts.fixed123Exact+=f?1:0;counts.rankExact+=r?1:0;
  const actualWinner=byActualWinner[String(actual[0])];actualWinner.races++;actualWinner.modelExact+=m?1:0;actualWinner.fixed123Exact+=f?1:0;actualWinner.rankExact+=r?1:0;
  const winner=byPredictedWinner[String(model[0])];winner.races++;winner.modelExact+=m?1:0;winner.fixed123Exact+=f?1:0;winner.rankExact+=r?1:0;
  const day=byDate[date]??={races:0,modelExact:0,fixed123Exact:0,rankExact:0};day.races++;day.modelExact+=m?1:0;day.fixed123Exact+=f?1:0;day.rankExact+=r?1:0;
  counts.modelOnlyVsFixed+=m&&!f?1:0;counts.fixedOnlyVsModel+=f&&!m?1:0;
  counts.modelOnlyVsRank+=m&&!r?1:0;counts.rankOnlyVsModel+=r&&!m?1:0;
 }
 return {trainingDates:days.slice(0,split).map(d=>d.date),holdoutDates:days.slice(split).map(d=>d.date),trainingRaces:train.length,holdout:counts,byDate,byPredictedWinner,byActualWinner,warning:'Research only. Independent per-position probabilities multiplied without joint calibration; actual entry course and genuine pre-race rates not verified. Do not deploy or claim prospective accuracy.'};
}
