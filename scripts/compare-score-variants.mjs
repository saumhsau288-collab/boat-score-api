// Research-only side-by-side numeric score preview. Never alters production.
import {BASE_WEIGHTS,scoreRacer} from '../boat-score-2-calibration.js';
const KEYS=Object.keys(BASE_WEIGHTS);
export function compareScoreVariants(racers,candidateWeights){
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r.boat)).size!==6||
    racers.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6))
   return {status:'invalid_race'};
 if(!candidateWeights||KEYS.some(k=>!Number.isFinite(candidateWeights[k])||candidateWeights[k]<0)||
    Object.keys(candidateWeights).length!==KEYS.length||
    Math.abs(KEYS.reduce((s,k)=>s+candidateWeights[k],0)-100)>1e-8)
   return {status:'invalid_weights'};
 const rows=racers.map(r=>{
  const baseline=scoreRacer(r,BASE_WEIGHTS),candidate=scoreRacer(r,candidateWeights);
  return {boat:r.boat,baselineScore:baseline===null?null:Math.round(baseline*100)/100,
    candidateScore:candidate===null?null:Math.round(candidate*100)/100,
    delta:baseline===null||candidate===null?null:Math.round((candidate-baseline)*100)/100};
 });
 const complete=rows.every(r=>r.baselineScore!==null&&r.candidateScore!==null);
 const ranked=(field)=>[...rows].sort((a,b)=>b[field]-a[field]||a.boat-b.boat).map(r=>r.boat);
 const baselineRanking=complete?ranked('baselineScore'):null;
 const candidateRanking=complete?ranked('candidateScore'):null;
 const rankingChanges=complete?rows.map(r=>({boat:r.boat,
   baselineRank:baselineRanking.indexOf(r.boat)+1,
   candidateRank:candidateRanking.indexOf(r.boat)+1,
   rankDelta:baselineRanking.indexOf(r.boat)-candidateRanking.indexOf(r.boat)})):null;
 return {status:complete?'comparison_ready':'insufficient_data',
   baselineRanking,candidateRanking,rankingChanges,
   rankingChanged:complete?baselineRanking.some((boat,i)=>candidateRanking[i]!==boat):null,
   baselineWeights:BASE_WEIGHTS,candidateWeights,rows,
   productionChanged:false,actualDeployedScoreVerified:false,
   warning:'Baseline is independent scoring module, NOT verified deployed app score. Candidate is hypothetical. Requires genuine pre-race inputs and out-of-sample validation before deployment.'};
}
