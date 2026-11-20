// Research-only review template. No auto-approval of shortened names.
export function buildMakulaboReviewTemplate(snapshot,identityReview){
 if(identityReview?.status!=='identity_review_required'||
   !Array.isArray(identityReview.candidates)||identityReview.candidates.length!==6||
   !/^20\d{6}$/.test(String(snapshot?.date??''))||
   !Number.isInteger(Number(snapshot?.venue))||!Number.isInteger(Number(snapshot?.race)))
  return {status:'unavailable',reason:'six_racer_review_required'};
 const unresolved=identityReview.candidates.filter(x=>x.manualReviewRequired);
 if(unresolved.some(x=>!x.sameLabelledBoat||x.identityEvidence!=='abbreviated_name_review_required'))
  return {status:'unavailable',reason:'unresolved_non_abbreviation_identity'};
 return {status:'review_template',date:String(snapshot.date),venue:Number(snapshot.venue),race:Number(snapshot.race),
  approvals:unresolved.map(x=>({boat:x.boat,racerId:x.officialRacerId,
   officialName:x.officialName,sourceName:x.sourceName,reviewed:false})),
  note:'A human must independently verify every proposed identity and change reviewed to true. No score is applied.'};
}
