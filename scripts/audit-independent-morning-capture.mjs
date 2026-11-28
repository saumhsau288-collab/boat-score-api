// Research-only adapter. A saved deployed API response is NOT independently
// authenticated pre-race evidence. Never fill missing inputs from rankings.
import {evaluateEvidenceBatch} from './validate-independent-prerace-evidence.mjs';
export function auditMorningCaptureForIndependentMethods(capture) {
 if (!capture || !Array.isArray(capture.records)) throw Error('Capture records required');
 const rows=capture.records.map(row=>{
   const response=row?.response;
   const raw=response?.independentEvidence;
   // Only explicit six-racer evidence is admissible; ordinary ready:true
   // prediction responses do not contain the necessary source fields.
   return {
     date:row?.date,venue:row?.venue,race:row?.race,
     capturedAt:row?.receivedAt,
     officialCutoffAt:raw?.officialCutoffAt,
     cutoffSourceVerified:raw?.cutoffSourceVerified===true,
     captureSourceVerified:false, // server-observed response alone is insufficient
     modelVersion:raw?.modelVersion,
     featureSource:raw?.featureSource,
     racers:raw?.racers
   };
 });
 const batch=evaluateEvidenceBatch(rows);
 return {captureDate:capture.date||null,attempted:rows.length,
   eligibleForVerifiedAccuracy:0,
   provisionalComplete:batch.accepted.length,
   held:batch.heldCount,
   missingSixRacerFeatures:batch.held.filter(x=>x.errors.includes('invalid_six_racer_identity')||x.errors.includes('missing_six_racer_features')).length,
   note:'Read-only audit: capture response alone cannot authenticate official cutoff or pre-race features. No accuracy claim.',
   details:batch.held};
}
