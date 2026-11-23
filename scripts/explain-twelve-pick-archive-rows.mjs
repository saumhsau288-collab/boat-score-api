// Research-only per-race readiness details. Never certify caller-supplied provenance.
import {validateSixRacerSourceInputs} from './validate-six-racer-source-inputs.mjs';
import {auditTwelvePicks} from './audit-twelve-picks-research.mjs';
export function explainTwelvePickArchiveRows(rows){
 if(!Array.isArray(rows))return {status:'invalid_input'};
 return {status:'research_only',rows:rows.map((row,index)=>{
  const inputs=validateSixRacerSourceInputs(row?.scoreInputs);
  const audit=auditTwelvePicks([row]);
  const reasons=[];
  if(inputs.status!=='complete_unverified_inputs')reasons.push('original_inputs_incomplete');
  if(row?.preRacePredictionsSaved!==true)reasons.push('prediction_save_not_verified');
  if(row?.independentlyAuthenticatedCapture!==true)reasons.push('capture_not_authenticated');
  if(row?.officialCutoffVerified!==true)reasons.push('cutoff_not_verified');
  if(row?.officialResultVerified!==true)reasons.push('result_not_verified');
  if(audit.eligible===0)reasons.push('not_eligible_for_accuracy_audit');
  return {index,date:row?.date??null,venue:row?.venue??null,race:row?.race??null,
   originalInputsStatus:inputs.status,originalInputErrors:inputs.errors,
   accuracyEligible:audit.eligible===1&&inputs.status==='complete_unverified_inputs',
   reasons,authenticatedByThisTool:false};
 }),warning:'Per-row diagnostics are advisory; even true provenance flags are not independently authenticated here.'};
}
