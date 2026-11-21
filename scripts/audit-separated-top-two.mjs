import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Exploratory post-race archive only: ability values have no proven before-race timestamp.
export function auditSeparatedTopTwo(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const groups={adjacent:{races:0,bothPodium:0,betweenPodium:0,betweenSecond:0},separated:{races:0,bothPodium:0,betweenPodium:0,betweenSecond:0}};
 let excluded=0;const seen=new Set();
 for(const r of records){
  const p=classifyTopTwoAbilityPlacement(r?.racers),o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!p||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const [a,b]=p.boats;const between=Array.from({length:b-a-1},(_,i)=>a+i+1);
  const g=groups[p.adjacent?'adjacent':'separated'];g.races++;
  if(p.boats.every(n=>o.slice(0,3).includes(n)))g.bothPodium++;
  if(between.some(n=>o.slice(0,3).includes(n)))g.betweenPodium++;
  if(between.includes(o[1]))g.betweenSecond++;
 }
 for(const g of Object.values(groups)){g.bothPodiumRate=g.races?g.bothPodium/g.races:null;g.betweenPodiumRate=g.races?g.betweenPodium/g.races:null;g.betweenSecondRate=g.races?g.betweenSecond/g.races:null;}
 return {eligible:groups.adjacent.races+groups.separated.races,excluded,groups,warning:'Retrospective frame-number analysis only. Between means boat number between two highest archived win rates, not physical entry position. Archive win rates not verified pre-race.'};
}
