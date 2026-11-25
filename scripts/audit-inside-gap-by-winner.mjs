// Stratify the inside-vs-outside 2nd/3rd result by actual winner.
// This is strictly a descriptive post-outcome analysis.
export function auditInsideGapByWinner(records){
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const labels=['insideAheadBy1Plus','withinOne','outsideAheadBy1Plus'];
 const byWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,Object.fromEntries(labels.map(k=>[k,{races:0,insideSecond:0}]))]));
 let eligible=0,excluded=0;
 for(const r of records){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const rates=new Map(rs.map(x=>[x.boat,x.nationalWinRate])),inside=Math.min(o[1],o[2]),outside=Math.max(o[1],o[2]),gap=rates.get(inside)-rates.get(outside);
  const k=gap>=1?labels[0]:gap<=-1?labels[2]:labels[1];const g=byWinner[o[0]][k];g.races++;if(o[1]===inside)g.insideSecond++;eligible++;
 }
 return {eligible,excluded,byWinner,warning:'Actual winner and actual 2nd/3rd participants are known; never use as predictor or claim pre-race validation.'};
}
