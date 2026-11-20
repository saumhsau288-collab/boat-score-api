// Explain score/result mismatches without assuming causation or claiming prediction accuracy.
import {compareResearchScoresToFinish} from './compare-research-scores-to-finish.mjs';
export function diagnoseResearchScoreFinishGap(snapshot,recent50,result,courses){
 const comparison=compareResearchScoresToFinish(snapshot,recent50,result,courses);
 if(comparison.status!=='research_score_result_compared')
  return {status:'held',reason:comparison.reason,eligibleForCalibration:false};
 const scoreRank=new Map(comparison.scoreRankedBoats.map((boat,i)=>[boat,i+1]));
 const rows=comparison.rows.map(r=>{
  const rank=scoreRank.get(r.boat);
  return {...r,scoreRank:rank,finishMinusScoreRank:r.finishPosition-rank,
   discrepancy: r.finishPosition-rank>=2?'underperformed_score_rank':
    rank-r.finishPosition>=2?'outperformed_score_rank':'close_to_score_rank'};
 });
 const groups={underperformed:rows.filter(r=>r.discrepancy==='underperformed_score_rank'),
  outperformed:rows.filter(r=>r.discrepancy==='outperformed_score_rank'),
  close:rows.filter(r=>r.discrepancy==='close_to_score_rank')};
 return {status:'descriptive_gap_diagnosis',date:comparison.date,venue:comparison.venue,race:comparison.race,
  rows,groups,eligibleForCalibration:false,
  caveat:'Rank difference is descriptive, not proof of cause. ST, exhibition, wind, start incident and race conditions must be independently verified before causal explanations or weight tuning.'};
}
