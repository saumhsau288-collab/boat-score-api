// Analyze whether higher archived win-rate among 2nd/3rd finishers actually finishes 2nd.
// This conditions on the *actual* podium and is diagnostic only, never a predictor.
export function auditSecondThirdAbilityOrder(records){
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const byWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,{races:0,secondHigher:0,thirdHigher:0,tied:0,secondHigherByAtLeastOne:0,thirdHigherByAtLeastOne:0}]));
 let eligible=0,excluded=0;
 for(const r of records){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const rates=new Map(rs.map(x=>[x.boat,x.nationalWinRate]));
  const gap=rates.get(o[1])-rates.get(o[2]),g=byWinner[o[0]];g.races++;eligible++;
  if(gap>0){g.secondHigher++;if(gap>=1)g.secondHigherByAtLeastOne++;}
  else if(gap<0){g.thirdHigher++;if(gap<=-1)g.thirdHigherByAtLeastOne++;}
  else g.tied++;
 }
 return {eligible,excluded,byWinner,warning:'Post-outcome diagnostic: uses actual second/third participants, so not suitable for generating predictions. Archived win rates not verified pre-race.'};
}
