import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Among races where boat 1 has uniquely highest national/local mean,
// compare boat 1's own observed local-vs-national relationship.
export function auditBoatOneTopLocalAdvantage(records){
 if(!Array.isArray(records))throw Error('records required');
 const init=()=>({races:0,wins:0,podiums:0,secondWhenOneWins:{},thirdWhenOneWins:{}});
 const groups={higher:init(),equal:init(),lower:init(),missingLocal:init()};
 let invalid=0,tied=0,notTop=0;
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers);}catch{invalid++;continue;}
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){invalid++;continue;}
  if(ranked[0].score===ranked[1].score){tied++;continue;}
  if(ranked[0].boat!==1){notTop++;continue;}
  const first=ranked[0];
  const key=first.localFallback?'missingLocal':first.localWinRate>first.nationalWinRate?'higher':first.localWinRate<first.nationalWinRate?'lower':'equal';
  const g=groups[key];g.races++;
  if(o[0]===1){g.wins++;g.secondWhenOneWins[o[1]]=(g.secondWhenOneWins[o[1]]||0)+1;g.thirdWhenOneWins[o[2]]=(g.thirdWhenOneWins[o[2]]||0)+1;}
  if(o.slice(0,3).includes(1))g.podiums++;
 }
 return {groups,invalid,tied,notTop,warning:'Archive descriptive analysis only. Local/national rates may be post-race, and venue sample sizes unknown. Boat number does not certify actual course.'};
}
