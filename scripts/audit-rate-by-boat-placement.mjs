import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Boat number is only a proxy; actual entry course is not verified in this archive.
export function auditRateByBoatPlacement(records){
 if(!Array.isArray(records))throw TypeError('records required');
 const bands=[{label:'below4',lo:0,hi:4},{label:'4-5',lo:4,hi:5},{label:'5-6',lo:5,hi:6},{label:'6-7',lo:6,hi:7},{label:'7-8',lo:7,hi:8},{label:'8plus',lo:8,hi:Infinity}];
 const make=()=>({starts:0,wins:0,top2:0,top3:0,localFallbackStarts:0});
 const byMetric=Object.fromEntries(['national','nationalLocalAverage'].map(metric=>[metric,Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),Object.fromEntries(bands.map(b=>[b.label,make()]))]))]));
 let eligibleRaces=0,excludedRaces=0;
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers)}catch{excludedRaces++;continue}
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excludedRaces++;continue}
  eligibleRaces++;
  for(const x of ranked){
   const position=o.indexOf(x.boat);
   for(const [metric,value] of [['national',x.nationalWinRate],['nationalLocalAverage',x.score]]){
    const band=bands.find(b=>value>=b.lo&&value<b.hi);if(!band)continue;
    const g=byMetric[metric][String(x.boat)][band.label];g.starts++;g.wins+=position===0?1:0;g.top2+=position<2?1:0;g.top3+=position<3?1:0;g.localFallbackStarts+=x.localFallback?1:0;
   }
  }
 }
 return {eligibleRaces,excludedRaces,bands:bands.map(b=>b.label),byMetric,warning:'Boat number is NOT verified actual entry course. Historical rates are not authenticated pre-race snapshots; missing/zero local rates use national fallback. Sparse cells are unstable; descriptive frequencies, not calibrated probabilities.'};
}
