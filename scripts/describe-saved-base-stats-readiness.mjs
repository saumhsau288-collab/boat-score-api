// Research-only adapter for saved base-stat predictions.
// No independently authenticated pre-race source evidence is present in these records.
import {describeResearchSourceReadiness} from './describe-research-source-readiness.mjs';
export function describeSavedBaseStatsReadiness({prediction,deadlineAt}={}){
 const mode=prediction?.response?.predictionMode??prediction?.predictionMode;
 const readiness=describeResearchSourceReadiness({sources:{},deadlineAt});
 return {predictionMode:mode??null,savedPredictionPresent:Boolean(prediction),
  sourceEvidenceOrigin:'not_embedded_in_saved_base_stats_record',
  ...readiness,eligibleForCalibration:false,scoreChangeApplied:false};
}
