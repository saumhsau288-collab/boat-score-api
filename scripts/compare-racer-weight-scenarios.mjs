// Research-only side-by-side score comparison. No deployment or weight mutation.
import {researchWeightCandidate,scoreVerifiedPreRaceFactors,validateResearchWeights} from './research-score-weights.mjs';
export function compareRacerWeightScenarios(rows,candidates=[]){
 if(!Array.isArray(candidates)||candidates.length>12)throw Error('At most 12 candidate scenarios');
 const baseline=scoreVerifiedPreRaceFactors(rows,researchWeightCandidate);
 if(!baseline.ready)return {ready:false,reason:baseline.reason};
 const ids=new Set(),scenarios=[];
 for(const item of candidates){
  const id=item?.id;
  if(typeof id!=='string'||!/^[a-z][a-z0-9_-]{0,39}$/.test(id)||ids.has(id)||!validateResearchWeights(item?.weights))throw Error('Invalid or duplicate weight scenario');
  ids.add(id);
  const scored=scoreVerifiedPreRaceFactors(rows,item.weights);
  if(!scored.ready)throw Error('Scenario input rejected');
  const baselineRank=new Map(baseline.rankedScores.map((r,i)=>[r.boat,i+1]));
  scenarios.push({id,weights:{...item.weights},rankedScores:scored.rankedScores,
   rankChanges:scored.rankedScores.map((r,i)=>({boat:r.boat,baselineRank:baselineRank.get(r.boat),scenarioRank:i+1,change:baselineRank.get(r.boat)-(i+1)})),
   changedBoats:scored.rankedScores.filter((r,i)=>baselineRank.get(r.boat)!==i+1).length});
 }
 return {ready:true,researchOnly:true,eligibleForDeployment:false,baseline:{weights:{...researchWeightCandidate},rankedScores:baseline.rankedScores},scenarios,
  note:'Rank shifts are descriptive, not evidence of accuracy. Compare against verified holdout races before selecting weights.'};
}
