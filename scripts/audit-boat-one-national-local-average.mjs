// Research-only national/local win-rate average. Never add win rates together.
// A local rate of 0.00 is treated as unavailable and replaced by national rate.
// Missing local rates are reported separately, not represented as observed.
export function rankNationalLocalAverage(racers){
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r?.boat)).size!==6)throw Error('six unique boats required');
 const scored=racers.map(r=>{
  if(!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||!Number.isFinite(r.nationalWinRate)||r.nationalWinRate<0)throw Error('invalid national rate or boat');
  const hasLocal=Number.isFinite(r.localWinRate)&&r.localWinRate>0;
  const local=hasLocal?r.localWinRate:r.nationalWinRate;
  return {boat:r.boat,nationalWinRate:r.nationalWinRate,localWinRate:hasLocal?r.localWinRate:null,localFallback:!hasLocal,score:(r.nationalWinRate+local)/2};
 });
 return scored.sort((a,b)=>b.score-a.score||a.boat-b.boat);
}
export function auditBoatOneNationalLocalAverage(records){
 if(!Array.isArray(records))throw Error('records required');
 const counts={examined:records.length,eligible:0,boatOneTop:0,boatOneWins:0,boatOnePodium:0,missingLocalAny:0,allLocalObserved:0,tiedTop:0,invalid:0};
 const groups={allLocalObserved:{races:0,boatOneWins:0,boatOnePodium:0,secondWhenOneWins:{},thirdWhenOneWins:{}},localFallback:{races:0,boatOneWins:0,boatOnePodium:0,secondWhenOneWins:{},thirdWhenOneWins:{}}};
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers);}catch{counts.invalid++;continue;}
  if(ranked.some(x=>x.localFallback))counts.missingLocalAny++;else counts.allLocalObserved++;
  const o=r?.finishOrder;if(r.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6)continue;
  counts.eligible++;
  if(ranked[0].score===ranked[1].score){counts.tiedTop++;continue;}
  if(ranked[0].boat!==1)continue;
  counts.boatOneTop++;
  const g=groups[ranked.some(x=>x.localFallback)?'localFallback':'allLocalObserved'];g.races++;
  if(o[0]===1){counts.boatOneWins++;g.boatOneWins++;g.secondWhenOneWins[o[1]]=(g.secondWhenOneWins[o[1]]||0)+1;g.thirdWhenOneWins[o[2]]=(g.thirdWhenOneWins[o[2]]||0)+1;}
  if(o.slice(0,3).includes(1)){counts.boatOnePodium++;g.boatOnePodium++;}
 }
 return {counts,groups,warning:'Archived rates may be post-race. Local 0.00/missing replaced by national rate and counted as fallback, not genuine local evidence. Boat 1 is not verified actual course 1.'};
}
