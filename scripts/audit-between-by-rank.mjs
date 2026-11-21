import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Descriptive archive analysis. Within each boat, compare ability strength of candidate
// against winner and race field, without treating archived rates as pre-race snapshots.
export function auditBetweenByCandidateRank(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const groups=Object.fromEntries([2,3,4,5].map(boat=>[boat,{between:{topHalf:{races:0,second:0,podium:0},bottomHalf:{races:0,second:0,podium:0}},notBetween:{topHalf:{races:0,second:0,podium:0},bottomHalf:{races:0,second:0,podium:0}}}]));
 const seen=new Set();let excluded=0;
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const ranked=[...r.racers].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
  const [a,b]=p.boats;
  for(const [key,g] of Object.entries(groups)){
   const boat=Number(key),rank=ranked.findIndex(x=>x.boat===boat)+1;
   const s=(boat>a&&boat<b?g.between:g.notBetween)[rank<=3?'topHalf':'bottomHalf'];
   s.races++;if(o[1]===boat)s.second++;if(o.slice(0,3).includes(boat))s.podium++;
  }
 }
 for(const g of Object.values(groups))for(const side of [g.between,g.notBetween])for(const s of Object.values(side)){s.secondRate=s.races?s.second/s.races:null;s.podiumRate=s.races?s.podium/s.races:null;}
 return {groups,excluded,warning:'Exploratory archive only. Ability rank is derived from archived rates with unknown snapshot time. Not causal or predictive validation.'};
}
