// When actual 2nd and 3rd finishers differ in ability, how often does the inside boat finish ahead?
// Descriptive post-outcome comparison only; no prospective prediction claim.
export function auditInsideVersusAbility(records){
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const groups={insideHigher:{insideSecond:0,outsideSecond:0},outsideHigher:{insideSecond:0,outsideSecond:0},equalRate:{insideSecond:0,outsideSecond:0}};
 let eligible=0,excluded=0;
 for(const r of records){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const rates=new Map(rs.map(x=>[x.boat,x.nationalWinRate]));
  const inside=Math.min(o[1],o[2]),outside=Math.max(o[1],o[2]);
  const group=rates.get(inside)>rates.get(outside)?'insideHigher':rates.get(inside)<rates.get(outside)?'outsideHigher':'equalRate';
  groups[group][o[1]===inside?'insideSecond':'outsideSecond']++;eligible++;
 }
 return {eligible,excluded,groups,warning:'Uses actual second/third pair (outcome leakage); diagnostic only. Archived win rates not verified pre-race.'};
}
