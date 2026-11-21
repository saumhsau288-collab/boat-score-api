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
 if(!/^20\d{6}$/.test(String(date??''))||!/^20\d{2}-\d{2}-\d{2}T/.test(String(featureEvidence.capturedAt))||
  !String(featureEvidence.raceCutoffAt).startsWith(String(date).slice(0,4)+'-'+String(date).slice(4,6)+'-'+String(date).slice(6,8)))
  return held('race_date_or_cutoff_mismatch');
 if(Date.parse(resultEvidence.capturedAt)<=Date.parse(featureEvidence.raceCutoffAt))
  return held('result_capture_timing_invalid');
 const replay=replayHistoricalRace({date,venue,race,featuresByBoat,finishByBoat,featureEvidence});
 return {...replay,eligibleForDeployment:false};
}
