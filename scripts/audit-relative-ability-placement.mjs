import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Descriptive historical finish positions by boat and relative ability rank.
export function auditRelativeAbilityPlacement(records){
 if(!Array.isArray(records))throw TypeError('records required');
 const make=()=>({starts:0,first:0,second:0,third:0,top3:0,localFallback:0});
 const byBoatRank=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),Object.fromEntries(Array.from({length:6},(_,j)=>[String(j+1),make()]))]));
 const gapGroups=Object.fromEntries(['leadBy1Plus','leadUnder1','trailUnder1','trail1To2','trail2Plus'].map(k=>[k,make()]));
 let eligibleRaces=0,excludedRaces=0,tiedRanks=0;
 for(const record of records){
  let ranked;try{ranked=rankNationalLocalAverage(record?.racers)}catch{excludedRaces++;continue}
  const order=record?.finishOrder;
  if(record?.resultVerified!==true||!Array.isArray(order)||order.length!==6||new Set(order).size!==6||!order.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excludedRaces++;continue}
  if(ranked.some((x,i)=>i>0&&x.score===ranked[i-1].score)){tiedRanks++;continue}
  eligibleRaces++;
  const fieldAverage=ranked.reduce((sum,x)=>sum+x.score,0)/6;
  for(let i=0;i<6;i++){
   const x=ranked[i],position=order.indexOf(x.boat);
   const delta=x.score-fieldAverage;
   const gap=delta>=1?'leadBy1Plus':delta>=0?'leadUnder1':delta>=-1?'trailUnder1':delta>=-2?'trail1To2':'trail2Plus';
   for(const g of [byBoatRank[String(x.boat)][String(i+1)],gapGroups[gap]]){
    g.starts++;g.first+=position===0?1:0;g.second+=position===1?1:0;g.third+=position===2?1:0;g.top3+=position<3?1:0;g.localFallback+=x.localFallback?1:0;
   }
  }
 }
 return {eligibleRaces,excludedRaces,tiedRanks,byBoatRank,gapGroups,warning:'Boat number is not verified entry course. Archive win rates may be post-race; local 0/missing is fallback. These are descriptive frequencies, not prospective calibrated probabilities.'};
}
