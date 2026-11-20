import {createHash} from 'node:crypto';
// Research-only integrity check; never infer official cutoff from arbitrary HH:MM.
export function auditSavedOfficialCapture({body,metadata,expected}={}){
 const reasons=[];
 if(!Buffer.isBuffer(body)||body.length===0)reasons.push('empty_html');
 if(!metadata||!expected||metadata.expected?.date!==expected?.date||
    metadata.expected?.venue!==expected?.venue||metadata.expected?.race!==expected?.race)
   reasons.push('metadata_race_mismatch');
 if(Buffer.isBuffer(body)){
  const digest=createHash('sha256').update(body).digest('hex');
  if(metadata?.sha256!==digest||metadata?.byteLength!==body.length)reasons.push('content_integrity_mismatch');
 }
 if(!Number.isFinite(Date.parse(metadata?.requestedAt??''))||
    !Number.isFinite(Date.parse(metadata?.receivedAt??''))||
    Date.parse(metadata.receivedAt)<Date.parse(metadata.requestedAt))reasons.push('capture_time_invalid');
 if(metadata?.raceIdentityVerified!==false||metadata?.cutoffVerified!==false)
   reasons.push('premature_verification_claim');
 return {status:reasons.length?'hold':'captured_unverified',reasons,
   raceIdentityVerified:false,cutoffVerified:false,accuracyCalculationPermitted:false};
}
