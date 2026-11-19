// Offline historical comparison; requires VERIFIED pre-race data and results.
// Never use finishing positions as predictive inputs.
import {evaluateRace} from './boat-score-2-scoring.js';
import {experimentalRaceRanking} from './boat-score-2-racer-experiment.js';
const validOrder=a=>Array.isArray(a)&&a.length===6&&new Set(a).size===6&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
export function compareHistoricalRace(row){
 if(!row||row.preRaceSnapshot!==true||row.resultVerified!==true||
    !/^20\d{6}$/.test(String(row.date))||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||
    !Number.isInteger(row.race)||row.race<1||row.race>12||
    !validOrder(row.finishOrder))return {status:'excluded',reason:'unverified_or_invalid_race'};
 // Explicit evidence and pre-cutoff capture are mandatory; boolean flags alone are insufficient.
 const captured=Date.parse(row.preRaceCapturedAt),cutoff=Date.parse(row.officialCutoffAt);
 if(row.preRaceSourceVerified!==true||row.officialResultSourceVerified!==true||
    typeof row.preRaceSourceUrl!=='string'||!row.preRaceSourceUrl.startsWith('https://')||
    typeof row.officialResultSourceUrl!=='string'||!row.officialResultSourceUrl.startsWith('https://www.boatrace.jp/')||
    !Number.isFinite(captured)||!Number.isFinite(cutoff)||captured>=cutoff)
   return {status:'excluded',reason:'unverified_provenance_or_cutoff'};
 const old=evaluateRace(row.racers);
 const next=experimentalRaceRanking(row.racers);
 if(old.status!=='evaluated'||next.status!=='evaluated')
   return {status:'excluded',reason:'missing_pre_race_features'};
 const oldRanking=[...old.racers].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(r=>r.boat);
 const newRanking=next.ranked.map(r=>r.boat);
 const measure=ranked=>({winnerHit:ranked[0]===row.finishOrder[0],
   winnerRank:ranked.indexOf(row.finishOrder[0])+1,
   winnerTopThree:ranked.slice(0,3).includes(row.finishOrder[0]),
   podiumSetHit:ranked.slice(0,3).every(b=>row.finishOrder.slice(0,3).includes(b))});
 return {status:'compared',key:[row.date,row.venue,row.race].join(':'),old:measure(oldRanking),experimental:measure(newRanking),oldRanking,newRanking};
}
export function compareHistoricalSet(rows){
 if(!Array.isArray(rows))return {status:'invalid_input'};
 const seen=new Set(),items=[];
 for(const row of rows){
  const result=compareHistoricalRace(row);
  if(result.status==='compared'){
   if(seen.has(result.key))return {status:'duplicate_races',key:result.key};
   seen.add(result.key);
  }
  items.push(result);
 }
 const valid=items.filter(x=>x.status==='compared');
 const excludedReasons={};
 for(const item of items)if(item.status==='excluded')excludedReasons[item.reason]=(excludedReasons[item.reason]||0)+1;
 const totals=k=>({winnerHits:valid.filter(x=>x[k].winnerHit).length,
   winnerTopThreeHits:valid.filter(x=>x[k].winnerTopThree).length,
   winnerRankSum:valid.reduce((sum,x)=>sum+x[k].winnerRank,0),
   podiumSetHits:valid.filter(x=>x[k].podiumSetHit).length});
 return {status:valid.length?'evaluated':'insufficient_history',total:rows.length,
   eligible:valid.length,excluded:rows.length-valid.length,excludedReasons,baseline:totals('old'),
   experimental:totals('experimental'),
   warning:'Offline descriptive comparison only; not a validated out-of-sample gain.'};
}
