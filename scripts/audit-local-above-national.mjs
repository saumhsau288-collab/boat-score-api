// Descriptive archive audit: local win rate exceeds national win rate.
// Only observed positive local rates qualify; never treat national fallback as local evidence.
export function auditLocalAboveNational(records){
 if(!Array.isArray(records))throw Error('records required');
 const groups={localHigher:{entries:0,wins:0,podiums:0},localEqual:{entries:0,wins:0,podiums:0},localLower:{entries:0,wins:0,podiums:0}};
 const boatOne={localHigher:{races:0,wins:0,podiums:0},localEqual:{races:0,wins:0,podiums:0},localLower:{races:0,wins:0,podiums:0}};
 let eligibleRaces=0,excludedRaces=0,missingLocalEntries=0;
 for(const r of records){
  const rs=r?.racers,o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excludedRaces++;continue;}
  eligibleRaces++;
  for(const racer of rs){
   if(!Number.isFinite(racer?.nationalWinRate)||racer.nationalWinRate<0||!Number.isFinite(racer.localWinRate)||racer.localWinRate<=0){missingLocalEntries++;continue;}
   const group=racer.localWinRate>racer.nationalWinRate?'localHigher':racer.localWinRate<racer.nationalWinRate?'localLower':'localEqual';
   const g=groups[group];g.entries++;if(o[0]===racer.boat)g.wins++;if(o.slice(0,3).includes(racer.boat))g.podiums++;
   if(racer.boat===1){const b=boatOne[group];b.races++;if(o[0]===1)b.wins++;if(o.slice(0,3).includes(1))b.podiums++;}
  }
 }
 return {eligibleRaces,excludedRaces,missingLocalEntries,groups,boatOne,warning:'Archive-only descriptive association. Local and national rates are not authenticated pre-race, and local sample sizes are unknown; no causal or predictive claim.'};
}
