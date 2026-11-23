// Research-only fail-closed classification for predictor readiness diagnostics.
// Never turn missing evidence into a valid prediction or an inferred missing player field.
export function classifyPredictionReadiness(response){
 if(!response||typeof response!=='object')return {state:'unknown',reason:'response_missing',canScore:false};
 if(response.ready===true){
  if(response.officialVerified===true&&response.statsVerified===true)
   return {state:'ready_verified_flags',reason:'api_reports_verified',canScore:false};
  return {state:'ready_unverified',reason:'verification_flags_not_both_true',canScore:false};
 }
 if(response.ready!==false)return {state:'unknown',reason:'ready_flag_missing',canScore:false};
 const verified=response.officialVerified===true&&response.statsVerified===true;
 if(!verified){
  const retry=response.officialStatsRetry;
  const reason=retry==='official_http_403'?'reported_official_http_403':retry==='official_timeout'?'reported_official_timeout':'official_verification_unresolved';
  return {state:'blocked_unverified_official',reason,canScore:false,missingInputsKnown:Array.isArray(response.missingInputs)&&response.missingInputs.length>0};
 }
 if(!Array.isArray(response.missingInputs))return {state:'blocked_unknown_inputs',reason:'missing_input_list_unavailable',canScore:false};
 if(response.missingInputs.length)return {state:'blocked_missing_inputs',reason:'explicit_missing_inputs',canScore:false};
 return {state:'blocked_unknown',reason:'ready_false_without_explanation',canScore:false};
}
