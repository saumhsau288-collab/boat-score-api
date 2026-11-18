// Research-only per-race provenance gate. Never upgrades a timing candidate to authenticated evidence.
import {classifyCaptureTiming} from './audit-morning-official-cutoffs.mjs';
const key=r=>[r.date,r.venue,r.race].join(':');
export function auditCaptureCalibrationReadiness(capture,verifiedCutoffs=[]){
 if(!Array.isArray(capture?.records)||!Array.isArray(verifiedCutoffs))throw Error('Invalid capture or cutoffs');
 const byKey=new Map();
 for(const c of verifiedCutoffs){const k=key(c);if(byKey.has(k))throw Error('Duplicate official cutoff: '+k);byKey.set(k,c);}
 const counts={ready:0,missingCutoff:0,afterCutoff:0,beforeCutoffTimingOnly:0,missingRawSixBoatInputs:0,missingVerifiedOfficialResults:0,invalidCaptureTime:0,cutoffIdentityMismatch:0,notReady:0};
 const rows=[];
 for(const r of capture.records){
  if(r.response?.ready!==true){counts.notReady++;continue;}
  counts.ready++;
  const timing=classifyCaptureTiming(r,byKey.get(key(r)));
  if(timing.status==='captured_at_or_after_official_cutoff')counts.afterCutoff++;
  else if(timing.status==='captured_before_official_cutoff')counts.beforeCutoffTimingOnly++;
  else if(timing.status==='invalid_capture_time')counts.invalidCaptureTime++;
  else if(timing.status==='official_cutoff_identity_mismatch')counts.cutoffIdentityMismatch++;
  else counts.missingCutoff++;
  // rankedScores are output scores, not the six original inputs required for weight retuning.
  counts.missingRawSixBoatInputs++;
  counts.missingVerifiedOfficialResults++;
  rows.push({date:r.date,venue:r.venue,race:r.race,timing:timing.status,
   originalInputsVerified:false,officialResultVerified:false,calibrationEligible:false});
 }
 return {date:capture.date,counts,rows,eligibleForWeightTuning:0,
  warning:'A verified cutoff can establish timing only. Immutable pre-race provenance, six original score inputs, and independently verified official finish are all required before tuning.'};
}
