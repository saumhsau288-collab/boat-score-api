import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Descriptive rate per intervening candidate (not a predictive model).
export function auditInterveningCandidates(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const byGap=Object.fromEntries([1,2,3,4].map(n=>[n,{races:0,candidateSlots:0,candidateSecondHits:0,candidatePodiumHits:0}]));
 let excluded=0;const seen=new Set();
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const [a,b]=p.boats,gap=b-a-1;if(gap===0)continue;
  const g=byGap[gap];g.races++;g.candidateSlots+=gap;
  for(let boat=a+1;boat<b;boat++){if(o[1]===boat)g.candidateSecondHits++;if(o.slice(0,3).includes(boat))g.candidatePodiumHits++;}
 }
 for(const g of Object.values(byGap)){g.perCandidateSecondRate=g.candidateSlots?g.candidateSecondHits/g.candidateSlots:null;g.perCandidatePodiumRate=g.candidateSlots?g.candidatePodiumHits/g.candidateSlots:null;}
 return {byGap,excluded,warning:'Per-candidate normalization avoids raw any-of-many inflation, but is still a post-race descriptive archive with unknown pre-race ability snapshot.'};
}
