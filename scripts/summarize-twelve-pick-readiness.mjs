// Research-only completeness report. Never converts assertions into authenticated evidence.
import {auditTwelvePicks} from './audit-twelve-picks-research.mjs';
import {validateSixRacerSourceInputs} from './validate-six-racer-source-inputs.mjs';
export function summarizeTwelvePickReadiness(rows) {
 if(!Array.isArray(rows)) return {status:'invalid_input'};
 const audit=auditTwelvePicks(rows);
 const reasons={};
 for(const row of rows){
  const missing=[];
  if(row?.preRacePredictionsSaved!==true)missing.push('saved_prediction');
  if(row?.independentlyAuthenticatedCapture!==true)missing.push('authenticated_capture');
  if(row?.officialCutoffVerified!==true)missing.push('verified_cutoff');
  if(row?.officialResultVerified!==true)missing.push('verified_result');
  if(validateSixRacerSourceInputs(row?.scoreInputs).status!=='complete_unverified_inputs')missing.push('original_six_racer_inputs');
  if(!Array.isArray(row?.main)||row.main.length!==6||!Array.isArray(row?.upset)||row.upset.length!==6)missing.push('twelve_methods');
  for(const reason of missing)reasons[reason]=(reasons[reason]||0)+1;
 }
 return {status:'research_only',inputRows:rows.length,eligibleRaces:audit.eligible,
  excludedRows:audit.excluded.length,missingEvidenceCounts:reasons,
  hitRatesAvailable:audit.eligible>0,originalInputCompleteRows:rows.filter(r=>validateSixRacerSourceInputs(r?.scoreInputs).status==='complete_unverified_inputs').length,warning:'Flags are supplied by caller; this report does not independently authenticate timestamps, predictions or official results.'};
}
