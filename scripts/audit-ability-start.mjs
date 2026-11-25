import {classifyTopTwoAbilityPlacement} from './audit-ability-placement.mjs';
// Strictly pre-race captured ST estimate; no actual race start timing is permitted.
export function classifyAbilityAndStart(racers) {
 const placement=classifyTopTwoAbilityPlacement(racers);
 if(!placement)return null;
 const byBoat=new Map(racers.map(r=>[r.boat,r]));
 if(racers.some(r=>!Number.isFinite(r?.averageStartTiming)||r.averageStartTiming<0||r.averageStartTiming>1))return null;
 const [a,b]=placement.boats;
 const stA=byBoat.get(a).averageStartTiming,stB=byBoat.get(b).averageStartTiming;
 const delta=Math.abs(stA-stB);
 return {...placement,stGapSeconds:delta,startTimingGroup:delta<0.03?'close':delta<0.07?'moderate':'wide',
 fasterBoat:stA===stB?null:stA<stB?a:b};
}
export function auditAbilityAndStart(records) {
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const groups={};let excluded=0,eligible=0;const seen=new Set();
 for(const r of records){
  const o=r?.finishOrder;
  const cls=classifyAbilityAndStart(r?.racers);
  if(r?.resultVerified!==true||r?.asOfVerified!==true||r?.capturedBeforeStart!==true||
   r?.startTimingAsOfVerified!==true||!/^20\d{6}$/.test(String(r?.date))||
   !Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||
   !Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!cls){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');
  if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);eligible++;
  const groupKey=cls.placement+':'+cls.startTimingGroup;
  const g=groups[groupKey]??={races:0,bothTopThree:0,fasterWins:0};
  g.races++;
  if(cls.boats.every(n=>o.slice(0,3).includes(n)))g.bothTopThree++;
  if(cls.fasterBoat===o[0])g.fasterWins++;
 }
 for(const g of Object.values(groups)){g.bothTopThreeRate=g.races?g.bothTopThree/g.races:null;g.fasterWinsRate=g.races?g.fasterWins/g.races:null;}
 return {eligible,excluded,groups,warning:'Retrospective descriptions only. Requires verified before-race national win rates AND average ST snapshots. Actual start ST is not a pre-race feature.'};
}
