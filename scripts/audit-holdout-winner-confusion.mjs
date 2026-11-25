// Descriptive confusion matrix for fixed research heuristics on chronological holdout.
// Rows = actual winner; columns = predicted winner. No tuning on holdout.
export function auditHoldoutWinnerConfusion(reports,{podiumWeight=1,orderWeight=2}={}){
 if(!Array.isArray(reports)||reports.length<3)throw new Error('at least three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(x=>x.date)).size!==days.length)throw new Error('duplicate dates');
 const matrix=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,Object.fromEntries(Array.from({length:6},(_,j)=>[j+1,0]))]));
 let eligible=0,excluded=0;
 const sort=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 for(const day of days.slice(Math.floor(days.length*2/3)))for(const venue of day.reports||[])for(const r of venue.records||[]){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const p=sort(sort(rs,podiumWeight).slice(0,3),orderWeight)[0].boat;
  matrix[o[0]][p]++;eligible++;
 }
 return {eligible,excluded,holdoutDates:days.slice(Math.floor(days.length*2/3)).map(x=>x.date),matrix,warning:'Post-hoc descriptive diagnostics; archive rates not verified pre-race. Do not tune model on these held-out results.'};
}
