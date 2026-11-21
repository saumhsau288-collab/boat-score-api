// Descriptive diagnostics from existing retrospective official-85 reviews.
// Do not use this output to tune live scores or claim authenticated prediction accuracy.
export function summarizeRetrospectiveFinishRanks(records) {
 const held={};const reasons=k=>{held[k]=(held[k]||0)+1;};
 const positions=[1,2,3].map(finish=>({finish,rankCounts:Array(6).fill(0),total:0}));
 const pairs=new Map();const seen=new Set();let compared=0;
 for(const r of records??[]){
  if(r?.status!=='research_only_podium_compared'||r?.eligibleForCalibration!==false||
     r?.authenticatedHistoricalPrediction!==false){reasons('not_research_only_review');continue;}
  const key=[r.date,r.venue,r.race].join(':');
  if(seen.has(key)){reasons('duplicate_race');continue;}seen.add(key);
  const ranking=r.scoreRanking,podium=r.parsedPodium,ranks=r.actualPodiumScoreRanks;
  const valid=x=>Array.isArray(x)&&x.length===6&&new Set(x).size===6&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
  if(!valid(ranking)||!Array.isArray(podium)||podium.length!==3||
     new Set(podium).size!==3||podium.some(n=>!Number.isInteger(n)||n<1||n>6)||
     !Array.isArray(ranks)||ranks.length!==3||
     ranks.some((n,i)=>n!==ranking.indexOf(podium[i])+1)){reasons('invalid_ranking_or_podium');continue;}
  compared++;
  ranks.forEach((rank,i)=>{positions[i].rankCounts[rank-1]++;positions[i].total++;});
  // Conditional on ACTUAL winner: descriptive only, cannot be used directly as a pre-race predictor.
  for(let boat=1;boat<=6;boat++){
   if(boat===podium[0])continue;
   const id=podium[0]+'-'+boat;
   const p=pairs.get(id)??{winner:podium[0],candidate:boat,starts:0,second:0,third:0};
   p.starts++;p.second+=Number(podium[1]===boat);p.third+=Number(podium[2]===boat);pairs.set(id,p);
  }
 }
 return {status:'retrospective_descriptive_only',compared,held,positions,
  conditionalPairs:[...pairs.values()].sort((a,b)=>a.winner-b.winner||a.candidate-b.candidate).map(x=>({...x,secondRate:x.second/x.starts,thirdRate:x.third/x.starts})),
  eligibleForCalibration:false,authenticatedHistoricalPrediction:false,scoreChangeApplied:false,
  warning:'Actual winner and retrospective score ranking are post-event evidence; no predictive accuracy or deployment claim.'};
}
