// Research-only bridge: never interpret a live source as an archived pre-race prediction.
import {replayHistoricalRace} from './replay-historical-race-with-current-scoring.mjs';
export function replayVerifiedHistoricalPair({date,venue,race,featuresByBoat,finishByBoat,featureEvidence,resultEvidence}={}){
 const held=(reason)=>({status:'held',reason,eligibleForDeployment:false});
 if(resultEvidence?.independentlyVerified!==true||
  typeof resultEvidence?.officialResultUrl!=='string'||
  !/^https:\/\//.test(resultEvidence.officialResultUrl)||
  typeof resultEvidence?.sha256!=='string'||
  !/^[a-f0-9]{64}$/i.test(resultEvidence.sha256))
  return held('official_result_evidence_missing');
 if(!Number.isFinite(Date.parse(resultEvidence.capturedAt)))
  return held('official_result_capture_missing');
 if(!featureEvidence||!Number.isFinite(Date.parse(featureEvidence.capturedAt))||
  !Number.isFinite(Date.parse(featureEvidence.raceCutoffAt))||
  Date.parse(featureEvidence.capturedAt)>=Date.parse(featureEvidence.raceCutoffAt))
  return held('pre_cutoff_feature_capture_unverified');
 if(Date.parse(resultEvidence.capturedAt)<=Date.parse(featureEvidence.raceCutoffAt))
  return held('result_capture_timing_invalid');
 const replay=replayHistoricalRace({date,venue,race,featuresByBoat,finishByBoat,featureEvidence});
 return {...replay,eligibleForDeployment:false};
}
