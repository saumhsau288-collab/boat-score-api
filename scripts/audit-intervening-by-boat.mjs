import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Archive-only: separate candidate boat number to expose inner/outer frame confounding.
export function auditInterveningByBoat(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const byBoat=Object.fromEntries([1,2,3,4,5,6].map(n=>[n,{candidateRaces:0,second:0,podium:0}]));
 const seen=new Set();let excluded=0;
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const [a,b]=p.boats;
  for(let n=a+1;n<b;n++){const g=byBoat[n];g.candidateRaces++;if(o[1]===n)g.second++;if(o.slice(0,3).includes(n))g.podium++;}
 }
 for(const g of Object.values(byBoat)){g.secondRate=g.candidateRaces?g.second/g.candidateRaces:null;g.podiumRate=g.candidateRaces?g.podium/g.candidateRaces:null;}
 return {byBoat,excluded,warning:'Descriptive archived boat-number rates only. No verified before-race win-rate snapshot or actual entry course; do not use as score weights.'};
}
