import {createHash} from 'node:crypto';
import {validateOfficialRaceUrl} from './capture-official-html-evidence.mjs';
// Research-only: combine official HTML capture diagnostics without elevating candidates to verified facts.
import {inspectOfficialPageIdentity} from './inspect-official-page-identity.mjs';
import {extractOfficialCutoffCandidate} from './extract-official-cutoff-candidate.mjs';
export function auditOfficialRaceHtmlCapture({html,metadata}={}){
 const expected=metadata?.expected;
 if(typeof html!=='string'||!expected||!Number.isFinite(Date.parse(metadata?.receivedAt))||
   !/^[a-f0-9]{64}$/.test(String(metadata?.sha256??'')))
  return {status:'invalid_capture',eligibleForCalibration:false};
 const actualSha256=createHash('sha256').update(Buffer.from(html,'utf8')).digest('hex');
 if(actualSha256!==metadata.sha256)return {status:'capture_hash_mismatch',eligibleForCalibration:false};
 const date=expected.date,venue=Number(expected.venue),race=expected.race;
 if(!Number.isInteger(race)||race<1||race>12)
  return {status:'race_specific_capture_required',eligibleForCalibration:false};
 try {
  const normalized={date:String(date),venue:String(expected.venue),race};
  validateOfficialRaceUrl(metadata.requestedUrl,normalized);
  validateOfficialRaceUrl(metadata.finalUrl,normalized);
  if(metadata.requestedUrl!==metadata.finalUrl)
   return {status:'capture_url_mismatch',eligibleForCalibration:false};
 }catch{
  return {status:'invalid_official_source_url',eligibleForCalibration:false};
 }
 const identity=inspectOfficialPageIdentity(html,{date,venue,race});
 const cutoff=extractOfficialCutoffCandidate(html,{date,venue,race});
 return {status:'needs_independent_verification',identity,cutoff,
  raceIdentityVerified:false,officialCutoffVerified:false,eligibleForCalibration:false,
  note:'Consistent page markers and a labeled cutoff candidate do not independently authenticate official race identity or deadline.'};
}
