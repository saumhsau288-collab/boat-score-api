// Research-only bridge for archival: preserve original six-racer inputs with a
// twelve-ticket pre-cutoff snapshot. This does not authenticate the input source.
import {prepareCaptureFromApiResponse} from './prepare-capture-from-api-response.mjs';
import {validateSixRacerSourceInputs} from './validate-six-racer-source-inputs.mjs';
export function prepareCaptureWithOriginalInputs(input={}){
 const result=prepareCaptureFromApiResponse(input);
 if(result.status!=='prepared_not_authenticated')return result;
 const checked=validateSixRacerSourceInputs(input.scoreInputs);
 if(checked.status!=='complete_unverified_inputs')
  return {status:'original_inputs_incomplete',errors:checked.errors,snapshotSaved:false};
 const snapshot={...result.snapshot,
  scoreInputs:input.scoreInputs.map(r=>({...r})),
  originalInputsPresent:true,originalInputsAuthenticated:false,
  originalInputsValidation:'complete_unverified_inputs'};
 return {status:'prepared_not_authenticated',snapshot};
}
