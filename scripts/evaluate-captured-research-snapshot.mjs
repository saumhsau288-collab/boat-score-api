// Research-only bridge: score only independently verified six-racer snapshot and recent-50 evidence.
// Does not claim this is the deployed Worker predictor or a historically authenticated forecast.
import {evaluateMorningFromSources} from '../boat-score-2-morning-pipeline.js';
export function evaluateCapturedResearchSnapshot(snapshot,recent50){
 if(snapshot?.status!=='captured_research_inputs'||!Array.isArray(snapshot.racers)||snapshot.racers.length!==6)
  return {status:'held',reason:'six_verified_official_racers_required',eligibleForCalibration:false};
 if(!Array.isArray(recent50)||recent50.length!==6)
  return {status:'held',reason:'six_verified_recent50_records_required',eligibleForCalibration:false};
 const official=snapshot.racers.map(r=>({...r,sourceVerified:true}));
 const result=evaluateMorningFromSources({official,recent50});
 if(result.status!=='evaluated')
  return {status:'held',reason:result.reason||result.source||result.status,eligibleForCalibration:false};
 return {...result,date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  predictionEngine:'research_morning_pipeline_not_deployed_worker',
  eligibleForCalibration:false,preRaceIndependentlyVerified:false};
}
