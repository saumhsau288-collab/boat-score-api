import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Descriptive within-frame comparison: between versus NOT between, not a causal estimate.
export function auditBetweenVsNotBetween(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const byBoat=Object.fromEntries([2,3,4,5].map(n=>[n,{between:{races:0,second:0,podium:0},notBetween:{races:0,second:0,podium:0}}]));
 let excluded=0;const seen=new Set();
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const [a,b]=p.boats;
  for(const [key,g] of Object.entries(byBoat)){
   const n=Number(key),s=n>a&&n<b?g.between:g.notBetween;
   s.races++;if(o[1]===n)s.second++;if(o.slice(0,3).includes(n))s.podium++;
  }
 }
 for(const g of Object.values(byBoat)){
  for(const s of [g.between,g.notBetween]){s.secondRate=s.races?s.second/s.races:null;s.podiumRate=s.races?s.podium/s.races:null;}
  g.secondDifference=g.between.secondRate===null||g.notBetween.secondRate===null?null:g.between.secondRate-g.notBetween.secondRate;
  g.podiumDifference=g.between.podiumRate===null||g.notBetween.podiumRate===null?null:g.between.podiumRate-g.notBetween.podiumRate;
 }
 return {byBoat,excluded,warning:'Retrospective comparison only; groups differ in racer ability and entry. Archive nationalWinRate not verified pre-race.'};
}
