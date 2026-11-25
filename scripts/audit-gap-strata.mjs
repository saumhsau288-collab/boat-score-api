import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Exploratory archive analysis. Separate by number of intervening frames to avoid pooled bias.
export function auditGapStrata(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const byGap=Object.fromEntries([0,1,2,3,4].map(n=>[n,{races:0,betweenSecond:0,betweenPodium:0,bothStrongPodium:0}]));
 let excluded=0;const seen=new Set();
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const [a,b]=p.boats,gap=b-a-1,between=Array.from({length:gap},(_,i)=>a+i+1);
  const g=byGap[gap];g.races++;
  if(between.includes(o[1]))g.betweenSecond++;
  if(between.some(n=>o.slice(0,3).includes(n)))g.betweenPodium++;
  if(p.boats.every(n=>o.slice(0,3).includes(n)))g.bothStrongPodium++;
 }
 for(const g of Object.values(byGap)){g.betweenSecondRate=g.races?g.betweenSecond/g.races:null;g.betweenPodiumRate=g.races?g.betweenPodium/g.races:null;g.bothStrongPodiumRate=g.races?g.bothStrongPodium/g.races:null;}
 return {eligible:Object.values(byGap).reduce((s,g)=>s+g.races,0),excluded,byGap,warning:'Archive win rates are not verified pre-race. Rates are descriptive and not adjusted for ability, actual entry or winner selection.'};
}
