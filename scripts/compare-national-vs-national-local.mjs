import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Paired descriptive comparison on identical races, avoiding different-denominator claims.
export function compareNationalVsNationalLocal(records){
 if(!Array.isArray(records))throw Error('records required');
 const groups={allLocalObserved:{races:0,agreeTop:0,changedToBoatOne:0,changedAwayBoatOne:0,combinedBoatOneRaces:0,combinedBoatOneWins:0,nationalBoatOneRaces:0,nationalBoatOneWins:0,pairedBothUnique:0,nationalWinnerCorrect:0,combinedWinnerCorrect:0,disagree:0,nationalWinsDisagreements:0,combinedWinsDisagreements:0},localFallback:{races:0,agreeTop:0,changedToBoatOne:0,changedAwayBoatOne:0,combinedBoatOneRaces:0,combinedBoatOneWins:0,nationalBoatOneRaces:0,nationalBoatOneWins:0,pairedBothUnique:0,nationalWinnerCorrect:0,combinedWinnerCorrect:0,disagree:0,nationalWinsDisagreements:0,combinedWinsDisagreements:0}};
 let excluded=0;
 for(const r of records){
  let combined;try{combined=rankNationalLocalAverage(r?.racers);}catch{excluded++;continue;}
  const o=r?.finishOrder;if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6){excluded++;continue;}
  const national=[...combined].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
  const g=groups[combined.some(x=>x.localFallback)?'localFallback':'allLocalObserved'];g.races++;
  const n=national[0].nationalWinRate!==national[1].nationalWinRate?national[0].boat:null;
  const c=combined[0].score!==combined[1].score?combined[0].boat:null;
  if(n!==null&&c!==null){g.pairedBothUnique++;if(n===o[0])g.nationalWinnerCorrect++;if(c===o[0])g.combinedWinnerCorrect++;if(n===c)g.agreeTop++;else{g.disagree++;if(n===o[0])g.nationalWinsDisagreements++;if(c===o[0])g.combinedWinsDisagreements++;}}
  if(c===1&&n!==1)g.changedToBoatOne++;
  if(n===1&&c!==1)g.changedAwayBoatOne++;
  if(c===1){g.combinedBoatOneRaces++;if(o[0]===1)g.combinedBoatOneWins++;}
  if(n===1){g.nationalBoatOneRaces++;if(o[0]===1)g.nationalBoatOneWins++;}
 }
 return {groups,excluded,warning:'Descriptive same-race comparison only. Archive values are not authenticated pre-race. Different selected subsets cannot establish model improvement.'};
}
