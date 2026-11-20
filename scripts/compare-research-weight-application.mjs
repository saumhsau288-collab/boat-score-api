// Research-only application of a validated historical weight proposal.
// Never changes the default weights or production Worker.
import {evaluateRace,validateResearchWeights,SCORE_WEIGHTS} from '../boat-score-2-scoring.js';
import {evaluateWeightCandidates} from './evaluate-historical-weight-candidates.mjs';
export function compareResearchWeightApplication(records,racers,options={}){
 const report=evaluateWeightCandidates(records,options);
 const baseline=evaluateRace(racers,SCORE_WEIGHTS);
 if(report.status!=='research_comparison_only'||!report.proposedResearchWeights){
  return {status:'held',reason:report.status==='research_comparison_only'?report.proposalReason:report.status,
   historicalEligible:report.eligible??0,baseline,adjusted:null,applied:false};
 }
 if(!validateResearchWeights(report.proposedResearchWeights))
  return {status:'held',reason:'invalid_candidate_weights',baseline,adjusted:null,applied:false};
 const adjusted=evaluateRace(racers,report.proposedResearchWeights);
 if(baseline.status!=='evaluated'||adjusted.status!=='evaluated')
  return {status:'held',reason:'six_verified_current_racer_features_required',baseline,adjusted:null,applied:false};
 return {status:'research_comparison',reason:'historical_train_and_holdout_improved',baseline,adjusted,
  weights:report.proposedResearchWeights,applied:false,productionWeightsUnchanged:true,
  warning:'Research preview only. Independent evidence and approval required before production deployment.'};
}
