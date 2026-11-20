// Explicit provenance gate for offline batch research audits.
// A caller's verified flag alone does not establish original Makulabo source evidence.
import {auditRecent50SourceReadiness} from './audit-recent50-source-readiness.mjs';
import {auditSavedResearchBatch} from './audit-saved-research-batch.mjs';
export function auditSavedResearchBatchWithSourceEvidence(cases){
 if(!Array.isArray(cases))return {status:'held',reason:'cases_array_required'};
 const checked=cases.map((item,index)=>{
  const evidence=auditRecent50SourceReadiness({official:item?.snapshot?.racers,recent50:item?.recent50});
  return {index,evidence,case:item};
 });
 const eligible=checked.filter(x=>x.evidence.readyForVerifiedSourceReview);
 const summary=auditSavedResearchBatch(eligible.map(x=>x.case));
 return {...summary,sourceEvidenceReviewPassed:eligible.length,
  sourceEvidenceReviewHeld:checked.length-eligible.length,
  sourceEvidenceIssues:checked.filter(x=>!x.evidence.readyForVerifiedSourceReview).map(x=>({
   index:x.index,issues:x.evidence.issues,missingSourceEvidence:x.evidence.missingSourceEvidence
  })),
  eligibleForCalibration:false,
  warning:'Source evidence review is not independent source authentication, proof of pre-race capture, or permission to calibrate.'};
}
