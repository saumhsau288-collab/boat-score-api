// Research-only decomposition of exact-order errors on a chronological holdout.
// Actual finish order is used for EVALUATION ONLY, never to construct a prediction.
export function diagnoseHoldoutOrderErrors(reports,weights={podiumWeight:1,orderWeight:2}){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(d=>d.date)).size!==days.length)throw Error('duplicate dates');
 const holdout=days.slice(Math.floor(days.length*2/3));
 const score=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 const stats=()=>({races:0,exact:0,wrongWinner:0,rightWinnerWrongPodium:0,rightWinnerRightPodiumWrongOrder:0,rightPodiumWrongWinner:0,rightPodiumWrongSecondThird:0,other:0});
 const frame=stats(),twoStage=stats();let excluded=0;
 const record=(s,p,o)=>{
  s.races++;
  if(p.every((n,i)=>n===o[i])){s.exact++;return;}
  const samePodium=p.every(n=>o.slice(0,3).includes(n));
  if(samePodium){
   if(p[0]!==o[0])s.rightPodiumWrongWinner++;
   else if(p[1]===o[2]&&p[2]===o[1])s.rightPodiumWrongSecondThird++;
   else s.rightWinnerRightPodiumWrongOrder++;
  }else if(p[0]!==o[0])s.wrongWinner++;
  else s.rightWinnerWrongPodium++;
 };
 for(const day of holdout)for(const venue of day.reports||[])for(const r of venue.records||[]){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  record(frame,score(rs,0).slice(0,3).map(x=>x.boat),o);
  record(twoStage,score(score(rs,weights.podiumWeight).slice(0,3),weights.orderWeight).map(x=>x.boat),o);
 }
 return {holdoutDates:holdout.map(x=>x.date),weights,frameOnly:frame,twoStage,excluded,warning:'Exploratory only: archived win rates are not verified pre-race. Actual results used only to classify errors; no score promotion.'};
}
