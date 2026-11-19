// Independent, strict provenance gate for racer-level holdout inputs.
// A self-declared flag is not proof of a genuine pre-cutoff capture.
export function auditRacerHoldoutProvenance(race){
 const issues=[];
 const captured=Date.parse(race?.capturedAt??'');
 const cutoff=Date.parse(race?.cutoffAt??'');
 if(!Number.isFinite(captured)||!Number.isFinite(cutoff)||captured>=cutoff)issues.push('capture_not_before_cutoff');
 if(race?.captureProvenance!=='server_timestamped')issues.push('server_capture_provenance_missing');
 if(race?.source!=='official_live_entry')issues.push('official_live_entry_source_missing');
 if(race?.resultIndependentlyVerified!==true)issues.push('independent_result_missing');
 if(race?.chronologicalHoldout!==true)issues.push('chronological_holdout_missing');
 return {eligible:issues.length===0,issues,warning:'Fields must be backed by trusted server logs and official source evidence; self-declared values alone do not establish provenance.'};
}
