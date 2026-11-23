// Research-only join of already captured prediction and official-source responses.
// Do not fetch, authenticate or infer pre-race timing from this function.
import {extractOfficialSixRacerInputs} from './extract-official-six-racer-inputs.mjs';
import {inspectCaptureTimes} from './inspect-capture-times.mjs';
const key=r=>r&&/^20\d{6}$/.test(String(r.date))&&Number.isInteger(Number(r.venue))&&Number.isInteger(Number(r.race))&&Number(r.venue)>=1&&Number(r.venue)<=24&&Number(r.race)>=1&&Number(r.race)<=12?String(r.date)+'-'+String(Number(r.venue)).padStart(2,'0')+'-'+String(Number(r.race)).padStart(2,'0'):null;
export function joinPredictionWithOfficialSource(prediction,official,stage='morning'){
 const pkey=key(prediction),okey=key(official);
 if(!pkey||!okey||pkey!==okey)return {status:'race_identity_mismatch',joined:false,accuracyEligible:false};
 if(prediction?.ready!==true||!Array.isArray(prediction.main)||prediction.main.length!==6||!Array.isArray(prediction.upset)||prediction.upset.length!==6)
  return {status:'prediction_not_ready',joined:false,accuracyEligible:false};
 const temporal=inspectCaptureTimes({predictionCapturedAt:prediction.capturedAt,officialCapturedAt:official.capturedAt,cutoffAt:prediction.cutoffAt});
 const source=extractOfficialSixRacerInputs(official,stage);
 if(source.rows.length!==6)return {status:'official_source_unverified',joined:false,accuracyEligible:false};
 return {status:'joined_unverified',joined:true,raceKey:pkey,stage,
  main:prediction.main,upset:prediction.upset,sourceInputsByBoat:source.rows,
  temporalEvidence:temporal,temporalOrderPlausible:temporal.passes,
  sourceCompleteness:{complete:source.complete,missing:source.missing,invalid:source.invalid},
  predictionCapturedAt:prediction.capturedAt??null,officialCapturedAt:official.capturedAt??null,cutoffAt:prediction.cutoffAt??null,
  independentlyAuthenticatedCapture:false,officialCutoffVerified:false,officialResultVerified:false,
  accuracyEligible:false,
  warning:'Race identity and available original fields only. Timing and source authentication are unverified; not an accuracy audit.'};
}
