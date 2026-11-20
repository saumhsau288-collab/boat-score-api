// Research-only bridge: score only independently verified six-racer snapshot and recent-50 evidence.
// Does not claim this is the deployed Worker predictor or a historically authenticated forecast.
import {evaluateMorningFromSources} from '../boat-score-2-morning-pipeline.js';
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';
export function evaluateCapturedResearchSnapshot(snapshot,recent50){
 if(snapshot?.status!=='captured_research_inputs'||!Array.isArray(snapshot.racers)||snapshot.racers.length!==6)
  return {status:'held',reason:'six_verified_official_racers_required',eligibleForCalibration:false};
 if(!Array.isArray(recent50)||recent50.length!==6)
  return {status:'held',reason:'six_verified_recent50_records_required',eligibleForCalibration:false};
 // A stored research snapshot must carry its own explicit source authentication.
 // Never manufacture sourceVerified=true from a status string.
 if(snapshot.source!=='verified_official_metrics'||snapshot.racers.some(r=>r.sourceVerified!==true))
  return {status:'held',reason:'original_official_source_provenance_missing',eligibleForCalibration:false};
 const official=snapshot.racers;
 if(!validateOfficialMetrics(official).verified)
  return {status:'held',reason:'original_official_metrics_invalid',eligibleForCalibration:false};
 const result=evaluateMorningFromSources({official,recent50});
 if(result.status!=='evaluated')
  return {status:'held',reason:result.reason||result.source||result.status,eligibleForCalibration:false};
 return {...result,date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  predictionEngine:'research_morning_pipeline_not_deployed_worker',
  eligibleForCalibration:false,preRaceIndependentlyVerified:false};
}
