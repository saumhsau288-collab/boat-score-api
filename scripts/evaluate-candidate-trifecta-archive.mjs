// Fixed, untuned candidate against an independent frame-only baseline on later archive dates.
// Archived nationalWinRate is not verified pre-race; not a deployed-app comparison.
import {rankTrifectaCandidates} from './candidate-trifecta-score.mjs';
export function evaluateCandidateTrifectaArchive(reports){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const holdout=days.slice(Math.floor(days.length*2/3));
 const stats=()=>({races:0,first:0,second:0,third:0,exact:0,top12:0});
 const candidate=stats(),frameOnly=stats();let excluded=0;
 for(const d of holdout)for(const v of d.reports||[])for(const r of v.records||[]){
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  let predicted;
  try{predicted=rankTrifectaCandidates(r.racers);}catch{excluded++;continue;}
  const p=predicted.main[0].order,b=[1,2,3],actual=o.slice(0,3).join('-');
  for(const [s,t] of [[candidate,p],[frameOnly,b]]){
   s.races++;if(t[0]===o[0])s.first++;if(t[1]===o[1])s.second++;if(t[2]===o[2])s.third++;
   if(t.join('-')===actual)s.exact++;
  }
  if(predicted.main.some(x=>x.order.join('-')===actual))candidate.top12++;
 }
 return {testDates:holdout.map(x=>x.date),candidate,frameOnly,excluded,
 warning:'Fixed-weight exploratory holdout vs frame-only 1-2-3, NOT comparison to deployed app. Archived rates may reflect post-race information. No deployment decision.'};
}
