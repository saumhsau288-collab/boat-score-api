import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Compare intervening candidates against all boats of the SAME number in the SAME archived races.
// Exploratory only: win-rate snapshot timing is not verified.
export function auditInterveningVsFrameBaseline(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const byBoat=Object.fromEntries([2,3,4,5].map(n=>[n,{allRaces:0,allSecond:0,allPodium:0,betweenRaces:0,betweenSecond:0,betweenPodium:0}]));
 const seen=new Set();let excluded=0;
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const [a,b]=p.boats;
  for(const [key,g] of Object.entries(byBoat)){
   const n=Number(key),between=n>a&&n<b;
   g.allRaces++;if(o[1]===n)g.allSecond++;if(o.slice(0,3).includes(n))g.allPodium++;
   if(between){g.betweenRaces++;if(o[1]===n)g.betweenSecond++;if(o.slice(0,3).includes(n))g.betweenPodium++;}
  }
 }
 for(const g of Object.values(byBoat)){
  g.allSecondRate=g.allRaces?g.allSecond/g.allRaces:null;
  g.betweenSecondRate=g.betweenRaces?g.betweenSecond/g.betweenRaces:null;
  g.secondLift=g.allSecondRate===null||!g.betweenRaces?null:g.betweenSecondRate-g.allSecondRate;
  g.allPodiumRate=g.allRaces?g.allPodium/g.allRaces:null;
  g.betweenPodiumRate=g.betweenRaces?g.betweenPodium/g.betweenRaces:null;
  g.podiumLift=g.allPodiumRate===null||!g.betweenRaces?null:g.betweenPodiumRate-g.allPodiumRate;
 }
 return {byBoat,excluded,warning:'Same-frame descriptive baseline, not matched on ability or course; not causal. Archive win-rate snapshot timing unknown.'};
}
