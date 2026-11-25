// Candidate Boat Score 2 winner score, NOT deployed.
// Calibrated only after prospective held-out validation.
// Never uses finishing order, post-race data, or the race outcome.
export function scoreWinnerCandidates(racers,{innerAdvantage=0.6,abilityWeight=1}={}){
 if(!Array.isArray(racers)||racers.length!==6)throw Error('six pre-race racers required');
 if(!Number.isFinite(innerAdvantage)||innerAdvantage<0||!Number.isFinite(abilityWeight)||abilityWeight<0)throw Error('invalid weights');
 const boats=new Set();
 const scores=racers.map(r=>{
  if(!Number.isInteger(r.boat)||r.boat<1||r.boat>6||boats.has(r.boat))throw Error('invalid boat');
  boats.add(r.boat);
  if(!Number.isFinite(r.nationalWinRate)||r.nationalWinRate<0)throw Error('missing pre-race nationalWinRate');
  // Smooth positional advantage, not a forced win for boat 1.
  const inside=(6-r.boat)/5;
  return {boat:r.boat,score:abilityWeight*r.nationalWinRate+innerAdvantage*inside,
   ability:r.nationalWinRate,inside};
 });
 return scores.sort((a,b)=>b.score-a.score||a.boat-b.boat);
}
