// Diagnose holdout ordering errors by actual winning boat; no additional tuning.
export function auditHoldoutOrderByWinner(reports,{podiumWeight=1,orderWeight=2}={}){
 if(!Array.isArray(reports)||reports.length<3)throw new Error('at least three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(x=>x.date)).size!==days.length)throw new Error('duplicate dates');
 const holdout=days.slice(Math.floor(days.length*2/3));
 const byWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,{races:0,frameExact:0,twoStageExact:0,frameFirst:0,twoStageFirst:0,framePodium:0,twoStagePodium:0}]));
 const sort=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 let excluded=0;
 for(const day of holdout)for(const venue of day.reports||[])for(const r of venue.records||[]){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const frame=sort(rs,0).slice(0,3).map(x=>x.boat);
  const two=sort(sort(rs,podiumWeight).slice(0,3),orderWeight).map(x=>x.boat);
  const g=byWinner[o[0]];g.races++;
  if(frame[0]===o[0])g.frameFirst++;
  if(two[0]===o[0])g.twoStageFirst++;
  if(frame.every((n,i)=>n===o[i]))g.frameExact++;
  if(two.every((n,i)=>n===o[i]))g.twoStageExact++;
  g.framePodium+=frame.filter(n=>o.slice(0,3).includes(n)).length;
  g.twoStagePodium+=two.filter(n=>o.slice(0,3).includes(n)).length;
 }
 for(const g of Object.values(byWinner)){g.frameExactRate=g.races?g.frameExact/g.races:null;g.twoStageExactRate=g.races?g.twoStageExact/g.races:null;g.frameFirstRate=g.races?g.frameFirst/g.races:null;g.twoStageFirstRate=g.races?g.twoStageFirst/g.races:null;}
 return {holdoutDates:holdout.map(x=>x.date),excluded,byWinner,warning:'Descriptive post-hoc diagnostic of fixed previously selected weights; do not tune on holdout or claim prospective accuracy.'};
}
