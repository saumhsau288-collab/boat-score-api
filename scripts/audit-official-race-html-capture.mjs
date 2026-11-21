import {createHash} from 'node:crypto';
import {validateOfficialRaceUrl} from './capture-official-html-evidence.mjs';
// Research-only: combine official HTML capture diagnostics without elevating candidates to verified facts.
import {inspectOfficialPageIdentity} from './inspect-official-page-identity.mjs';
import {extractOfficialCutoffCandidate} from './extract-official-cutoff-candidate.mjs';
export function auditOfficialRaceHtmlCapture({html,metadata}={}){
 const expected=metadata?.expected;
 if(!(typeof html==='string'||Buffer.isBuffer(html))||!expected||!Number.isFinite(Date.parse(metadata?.receivedAt))||
   !/^[a-f0-9]{64}$/.test(String(metadata?.sha256??'')))
  return {status:'invalid_capture',eligibleForCalibration:false};
 const capturedBytes=Buffer.isBuffer(html)?html:Buffer.from(html,'utf8');
 const actualSha256=createHash('sha256').update(capturedBytes).digest('hex');
 if(actualSha256!==metadata.sha256)return {status:'capture_hash_mismatch',eligibleForCalibration:false};
 if(metadata.byteLength!==capturedBytes.length||metadata.httpStatus!==200||
  !/^text\/html(?:;|$)/i.test(String(metadata.contentType??'')))
  return {status:'invalid_capture_response_metadata',eligibleForCalibration:false};
 const requestedAt=Date.parse(metadata.requestedAt),receivedAt=Date.parse(metadata.receivedAt);
 if(!Number.isFinite(requestedAt)||!Number.isFinite(receivedAt)||receivedAt<requestedAt)
  return {status:'invalid_capture_timestamps',eligibleForCalibration:false};
 const date=expected.date,venue=Number(expected.venue),race=expected.race;
 if(!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24||
  !Number.isInteger(race)||race<1||race>12)
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
 const decoded=capturedBytes.toString('utf8');
 if(!Buffer.from(decoded,'utf8').equals(capturedBytes))
  return {status:'unsupported_html_encoding',eligibleForCalibration:false};
 const identity=inspectOfficialPageIdentity(decoded,{date,venue,race});
 const cutoff=extractOfficialCutoffCandidate(decoded,{date,venue,race});
 return {status:'needs_independent_verification',identity,cutoff,
  raceIdentityVerified:false,officialCutoffVerified:false,eligibleForCalibration:false,
  note:'Consistent page markers and a labeled cutoff candidate do not independently authenticate official race identity or deadline.'};
}
