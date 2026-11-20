// Research-only identity review. Displays the six labelled racer names for
// human review; NEVER approves a shortened name based only on prefix/boat.
import {matchRecent50Racers} from '../boat-score-2-recent50-identity.js';
import {normalizeRacerName} from '../boat-score-2-recent50-identity.js';

export function describeMakulaboIdentityReview(official,extracted){
 if(!Array.isArray(official)||official.length!==6||
    !Array.isArray(extracted?.parsedRows)||extracted.parsedRows.length!==6||
    extracted?.verified!==true)
  return {status:'identity_review_unavailable',reason:'six_source_rows_required'};
 const matched=matchRecent50Racers(official,extracted.parsedRows);
 const candidates=official.map(r=>{
  const source=extracted.parsedRows.find(s=>s.boat===r.boat);
  const identity=matched.matches.find(m=>m.boat===r.boat);
  const officialName=normalizeRacerName(r.name),sourceName=normalizeRacerName(source?.name);
  const exactRegistration=String(source?.racerId??'')===String(r.racerId)&&/^\d{4}$/.test(String(r.racerId));
  const exactName=officialName.length>0&&officialName===sourceName;
  const abbreviated=sourceName.length>=1&&officialName.startsWith(sourceName)&&sourceName!==officialName;
  return {boat:r.boat,officialRacerId:String(r.racerId),officialName:r.name,
   sourceName:source?.name??null,sourceRacerId:source?.racerId??null,
   sameLabelledBoat:source?.boat===r.boat,
   matchMethod:identity?.method??null,matchStatus:identity?.status??'unverified',
   identityEvidence:exactRegistration?'exact_registration':exactName?'exact_name':
    abbreviated?'abbreviated_name_review_required':'unverified',
   manualReviewRequired:!exactRegistration&&!exactName};
 });
 return {status:'identity_review_required',verified:false,scoreChangeApplied:false,
  candidates,reason:'abbreviated_or_other_identity_requires_explicit_review'};
}
