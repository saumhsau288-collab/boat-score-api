// Offline research-only trifecta selection from existing six-boat evaluation scores.
// Scores are relative indices, NOT calibrated winning probabilities.
// No production worker changes; no score weights adjusted.
export function splitScoreLeaderTickets(rankedScores,{perGroup=6}={}){
 if(!Array.isArray(rankedScores)||rankedScores.length!==6||
   new Set(rankedScores.map(r=>r?.boat)).size!==6||
   rankedScores.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6||!Number.isFinite(r.score))||
   !Number.isInteger(perGroup)||perGroup<1||perGroup>120)
  return {ready:false,reason:'invalid_scores'};
 const ranked=[...rankedScores].sort((a,b)=>b.score-a.score||a.boat-b.boat);
 const leader=ranked[0].boat, scores=new Map(ranked.map(r=>[r.boat,r.score]));
 const tickets=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  tickets.push({boats:[a,b,c],strength:scores.get(a)*.56+scores.get(b)*.29+scores.get(c)*.15});
 }
 const sort=(a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join(''));
 const main=tickets.filter(t=>t.boats[0]===leader).sort(sort).slice(0,perGroup).map(t=>t.boats);
 const upsetSecondThird=tickets.filter(t=>t.boats[0]!==leader&&t.boats.slice(1).includes(leader)).sort(sort);
 const upsetOut=tickets.filter(t=>!t.boats.includes(leader)).sort(sort);
 // The first 3 upset tickets keep the leader in 2nd/3rd; the next 3 exclude it.
 // For odd perGroup, allocate the extra ticket to the non-winner branch.
 const keepCount=Math.ceil(perGroup/2),outCount=perGroup-keepCount;
 const upset=[...upsetSecondThird.slice(0,keepCount),...upsetOut.slice(0,outCount)].map(t=>t.boats);
 return {ready:true,leaderBoat:leader,rankedScores:ranked,main,upset,
  upsetLeaderPlaced:keepCount,upsetLeaderOut:outCount,
  scoreWeightsChanged:false,productionChanged:false,calibrated:false,
  method:'offline_score_leader_split_unvalidated'};
}
export function compareScoreLeaderTickets(prediction,actualPodium){
 if(!prediction?.ready||!Array.isArray(actualPodium)||actualPodium.length!==3||
  new Set(actualPodium).size!==3||actualPodium.some(n=>!Number.isInteger(n)||n<1||n>6))
  return {status:'not_comparable'};
 const key=actualPodium.join('-'),matches=xs=>xs.some(x=>x.join('-')===key);
 return {status:'research_only',actualPodium,mainExact:matches(prediction.main),
  upsetExact:matches(prediction.upset),leaderWon:actualPodium[0]===prediction.leaderBoat,
  leaderPodium:actualPodium.includes(prediction.leaderBoat),
  independentlyVerified:false,eligibleForScoreChange:false};
}
