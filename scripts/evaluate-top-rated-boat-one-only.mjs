// Restrict archived comparison to races where boat 1 has the sole highest national win rate.
// Boat number is not proof of actual entry course; national rate is NOT Boat Score evaluation.
import {rankTrifectaCandidates} from './candidate-trifecta-score.mjs';
export function evaluateTopRatedBoatOneOnly(reports){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three archive days required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const holdout=days.slice(Math.floor(days.length*2/3));
 const summary=()=>({races:0,first:0,second:0,third:0,exact:0,top12:0});
 const candidate=summary(),baseline=summary(),daily=[];
 let examined=0,excludedInvalid=0,excludedNotTop=0,excludedTied=0;
 for(const d of holdout){
  const day={date:d.date,candidate:summary(),baseline:summary(),selected:0};daily.push(day);
  for(const v of d.reports||[])for(const r of v.records||[]){
   examined++;
   const o=r?.finishOrder,rs=r?.racers;
   if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excludedInvalid++;continue;}
   const sorted=[...rs].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
   if(sorted[0].nationalWinRate===sorted[1].nationalWinRate){excludedTied++;continue;}
   if(sorted[0].boat!==1){excludedNotTop++;continue;}
   const pred=rankTrifectaCandidates(rs,{innerAdvantage:5,secondInside:5,thirdInside:1});
   const actual=o.slice(0,3).join('-'),first=pred.main[0].order;
   day.selected++;
   for(const [s,t] of [[candidate,first],[baseline,[1,2,3]],[day.candidate,first],[day.baseline,[1,2,3]]]){
    s.races++;if(t[0]===o[0])s.first++;if(t[1]===o[1])s.second++;if(t[2]===o[2])s.third++;if(t.join('-')===actual)s.exact++;
   }
   if(pred.main.some(x=>x.order.join('-')===actual)){candidate.top12++;day.candidate.top12++;}
  }
 }
 return {testDates:holdout.map(x=>x.date),examined,selected:candidate.races,excludedInvalid,excludedNotTop,excludedTied,candidate,baseline,daily,
 warning:'Boat 1 only, not confirmed actual course 1. Highest archived national win rate is a proxy, NOT highest Boat Score evaluation. Archived rates not verified pre-race. Exploratory subset selected from previously studied dates; NOT prospective.'};
}
