// Research-only explicit identity approval. No global name aliases or implicit approvals.
import {extractMakulaboFinishTable} from '../boat-score-2-makulabo-source-table.js';
import {describeMakulaboIdentityReview} from './describe-makulabo-identity-review.mjs';
import {evaluateVerifiedMakulaboResearch} from './evaluate-verified-makulabo-research.mjs';

export function applyReviewedMakulaboIdentities(snapshot,html,review){
 const held=reason=>({status:'held',reason,eligibleForCalibration:false,scoreChangeApplied:false});
 if(!snapshot||!review||String(review.date)!==String(snapshot.date)||
   Number(review.venue)!==Number(snapshot.venue)||Number(review.race)!==Number(snapshot.race))
  return held('review_race_identity_mismatch');
 const extracted=extractMakulaboFinishTable(html);
 if(!extracted.verified)return held('makulabo_table_not_verified');
 const diagnosis=describeMakulaboIdentityReview(snapshot.racers,extracted);
 if(diagnosis.status!=='identity_review_required')return held('identity_review_unavailable');
 const required=diagnosis.candidates.filter(x=>x.manualReviewRequired);
 if(required.some(x=>x.identityEvidence!=='abbreviated_name_review_required'||!x.sameLabelledBoat))
  return held('unresolved_identity_conflict');
 const approvals=review.approvals;
 if(!Array.isArray(approvals)||approvals.length!==required.length||
   new Set(approvals.map(x=>x.boat)).size!==approvals.length)
  return held('complete_explicit_review_required');
 const reviewed=[];
 for(const candidate of required){
  const a=approvals.find(x=>x.boat===candidate.boat);
  if(!a||a.reviewed!==true||String(a.racerId)!==candidate.officialRacerId||
   a.officialName!==candidate.officialName||a.sourceName!==candidate.sourceName)
   return held('review_pair_not_confirmed');
  reviewed.push({boat:a.boat,racerId:a.racerId,officialName:a.officialName,
   sourceName:a.sourceName,reviewed:true});
 }
 extracted.reviewedIdentityPairs=reviewed;
 const result=evaluateVerifiedMakulaboResearch(snapshot,extracted);
 return {...result,manualIdentityReviewApplied:result.status==='makulabo_identity_joined'||result.status==='research_morning_evaluated',eligibleForCalibration:false,
  warning:'Human identity approval is not proof of verified recent-50 win rate or pre-race prediction.'};
}
