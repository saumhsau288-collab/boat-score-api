// Diagnose inner-versus-outer finishing order by archived ability gap.
// Actual 2nd/3rd pair is used: descriptive only, not a pre-race predictor.
export function auditInsideAbilityGap(records){
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const labels=['inside +2 or more','inside +1 to <2','inside +0 to <1','outside +0 to <1','outside +1 to <2','outside +2 or more'];
 const groups=Object.fromEntries(labels.map(k=>[k,{races:0,insideSecond:0,outsideSecond:0}]));
 let eligible=0,excluded=0;
 for(const r of records){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const rates=new Map(rs.map(x=>[x.boat,x.nationalWinRate])),inside=Math.min(o[1],o[2]),outside=Math.max(o[1],o[2]),gap=rates.get(inside)-rates.get(outside);
  const key=gap>=2?labels[0]:gap>=1?labels[1]:gap>=0?labels[2]:gap>-1?labels[3]:gap>-2?labels[4]:labels[5];
  const g=groups[key];g.races++;g[o[1]===inside?'insideSecond':'outsideSecond']++;eligible++;
 }
 return {eligible,excluded,groups,warning:'Actual podium pair is known in this descriptive analysis; archived win rates not confirmed pre-race. No predictive inference.'};
}
