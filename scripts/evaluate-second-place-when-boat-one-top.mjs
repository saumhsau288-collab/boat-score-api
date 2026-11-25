import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Fixed, predeclared second-place heuristics when boat 1 is highest by combined rates.
// Report all selected races and separately the post-result boat-one-winner subset.
export function evaluateSecondPlaceWhenBoatOneTop(records){
 if(!Array.isArray(records))throw Error('records required');
 const init=()=>({races:0,oneWins:0,secondCorrectAll:0,secondCorrectWhenOneWins:0});
 const groups={allLocalObserved:{fixedTwo:init(),fixedThree:init(),bestRemaining:init(),bestInnerTwoThree:init()},localFallback:{fixedTwo:init(),fixedThree:init(),bestRemaining:init(),bestInnerTwoThree:init()}};
 let excluded=0,selected=0;
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers);}catch{excluded++;continue;}
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  if(ranked[0].boat!==1||ranked[0].score===ranked[1].score)continue;
  selected++;
  const g=groups[ranked.some(x=>x.localFallback)?'localFallback':'allLocalObserved'];
  const inner=ranked.filter(x=>x.boat===2||x.boat===3).sort((a,b)=>b.score-a.score||a.boat-b.boat)[0].boat;
  const picks={fixedTwo:2,fixedThree:3,bestRemaining:ranked.find(x=>x.boat!==1).boat,bestInnerTwoThree:inner};
  for(const [name,pick] of Object.entries(picks)){
   const a=g[name];a.races++;if(o[0]===1)a.oneWins++;
   if(o[1]===pick){a.secondCorrectAll++;if(o[0]===1)a.secondCorrectWhenOneWins++;}
  }
 }
 return {selected,excluded,groups,warning:'Exploratory, fixed second-place rules; rates from archive not authenticated pre-race. Conditional one-wins subset uses post-race outcome. No deployment.'};
}
