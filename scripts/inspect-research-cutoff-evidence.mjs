// Research-only evidence gate: no promotion of an unverified HTML candidate.
import {classifyOfficialResponseSource} from './classify-official-response-source.mjs';
import {inspectOfficialPageIdentity} from './inspect-official-page-identity.mjs';
import {extractOfficialCutoffCandidate} from './extract-official-cutoff-candidate.mjs';
export function inspectResearchCutoffEvidence({requestedUrl,responseUrl,httpStatus,contentType,html,race}={}){
 if(!race||typeof html!=='string')return {status:'invalid_input',verified:false};
 const source=classifyOfficialResponseSource({requestedUrl,responseUrl,httpStatus,contentType});
 if(source.status!=='official_html_source_consistent_not_authenticated')
  return {status:'source_rejected',sourceStatus:source.status,verified:false};
 const identity=inspectOfficialPageIdentity(html,race);
 const candidate=extractOfficialCutoffCandidate(html,race);
 if(identity.status!=='identity_markers_consistent_not_authenticated')
  return {status:'identity_unresolved',identityStatus:identity.status,candidateStatus:candidate.status,verified:false};
 if(candidate.status!=='candidate_needs_official_page_identity_verification')
  return {status:'cutoff_unresolved',candidateStatus:candidate.status,verified:false};
 return {status:'consistent_candidate_requires_independent_authentication',candidateCutoffAt:candidate.cutoffAt,verified:false,
  warning:'URL, HTML markers and cutoff label consistency alone cannot authenticate a deadline.'};
}
