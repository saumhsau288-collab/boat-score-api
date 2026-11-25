import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Per-day descriptive stability; dates are not shuffled or treated as training samples.
export function auditDailyAbilityRank(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const byDay={};const seen=new Set();let excluded=0;
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const ranked=[...r.racers].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
  const g=byDay[r.date]??={eligible:0,innerTopHalf:{races:0,second:0},innerBottomHalf:{races:0,second:0}};
  g.eligible++;
  for(const boat of [2,3]){
   const rank=ranked.findIndex(x=>x.boat===boat)+1;
   const s=rank<=3?g.innerTopHalf:g.innerBottomHalf;
   s.races++;if(o[1]===boat)s.second++;
  }
 }
 for(const g of Object.values(byDay))for(const s of [g.innerTopHalf,g.innerBottomHalf])s.secondRate=s.races?s.second/s.races:null;
 return {byDay,excluded,warning:'Archive-only per-day stability check. Rates are not verified pre-race; same race contributes both 2 and 3 boats.'};
}
