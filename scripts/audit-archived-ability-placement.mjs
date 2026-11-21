import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// ARCHIVE-ONLY exploratory tabulation. Rates in post-race B/K archives are NOT proven pre-race.
export function auditArchivedAbilityPlacement(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const groups={innerPair:{races:0,bothPodium:0},outerPair:{races:0,bothPodium:0},splitInnerOuter:{races:0,bothPodium:0},includesMiddle:{races:0,bothPodium:0}};
 let excluded=0;const seen=new Set();
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const g=groups[p.placement];g.races++;if(p.boats.every(n=>o.slice(0,3).includes(n)))g.bothPodium++;
 }
 for(const g of Object.values(groups))g.bothPodiumRate=g.races?g.bothPodium/g.races:null;
 return {eligible:Object.values(groups).reduce((n,g)=>n+g.races,0),excluded,groups,warning:'EXPLORATORY POST-RACE ARCHIVE ONLY: nationalWinRate snapshot time is unknown. Possible future leakage; no predictive accuracy, no scoring weights.'};
}
