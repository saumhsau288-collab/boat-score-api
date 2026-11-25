// Audit feature availability without inventing missing pre-race inputs.
export function auditProspectiveFeatureCoverage(records){
 if(!Array.isArray(records))throw Error('records array required');
 const keys=['nationalWinRate','averageStartTiming','motorTwoRate','exhibitionTime'];
 const out={races:records.length,validSixBoatRaces:0,features:Object.fromEntries(keys.map(k=>[k,{present:0,total:0,completeRaces:0}]))};
 for(const r of records){
  const racers=r?.racers;
  if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x?.boat)).size!==6||!racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6))continue;
  out.validSixBoatRaces++;
  for(const k of keys){
   const n=racers.filter(x=>Number.isFinite(x[k])&&x[k]>=0).length;
   out.features[k].present+=n;out.features[k].total+=6;
   if(n===6)out.features[k].completeRaces++;
  }
 }
 return {...out,warning:'Coverage only. Field presence does not verify source authenticity or pre-race capture timing.'};
}
