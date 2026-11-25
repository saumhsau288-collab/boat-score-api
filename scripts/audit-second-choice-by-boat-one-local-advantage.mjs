import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Compare predeclared second-place choices on identical races stratified by boat-one local advantage.
export function auditSecondChoiceByBoatOneLocalAdvantage(records){
 if(!Array.isArray(records))throw Error('records required');
 const init=()=>({races:0,oneWins:0,secondCorrectAll:0,secondCorrectWhenOneWins:0});
 const groups=Object.fromEntries(['higher','lower','equal','missingLocal'].map(k=>[k,{fixedTwo:init(),fixedThree:init(),bestInnerTwoThree:init(),bestRemaining:init()}]));
 let invalid=0;
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers);}catch{invalid++;continue;}
  const o=r?.finishOrder;if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){invalid++;continue;}
  if(ranked[0].boat!==1||ranked[0].score===ranked[1].score)continue;
  const first=ranked[0],key=first.localFallback?'missingLocal':first.localWinRate>first.nationalWinRate?'higher':first.localWinRate<first.nationalWinRate?'lower':'equal';
  const inner=ranked.filter(x=>x.boat===2||x.boat===3).sort((a,b)=>b.score-a.score||a.boat-b.boat)[0].boat;
  const picks={fixedTwo:2,fixedThree:3,bestInnerTwoThree:inner,bestRemaining:ranked.find(x=>x.boat!==1).boat};
  for(const [name,pick] of Object.entries(picks)){
   const a=groups[key][name];a.races++;if(o[0]===1)a.oneWins++;
   if(o[1]===pick){a.secondCorrectAll++;if(o[0]===1)a.secondCorrectWhenOneWins++;}
  }
 }
 return {groups,invalid,warning:'Exploratory archive comparison, not pre-race authenticated. The one-wins subset is conditioned on a post-race outcome. No score changes or deployment.'};
}
