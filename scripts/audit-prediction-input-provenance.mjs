// Research-only: distinguish saved predictor outputs from independently proven inputs.
export function auditPredictionInputProvenance({prediction,official}={}){
 const key=x=>[String(x?.date??'').replaceAll('-',''),Number(x?.venue),Number(x?.race)].join('/');
 const valid=x=>/^20\d{6}\/([1-9]|1\d|2[0-4])\/([1-9]|1[0-2])$/.test(key(x));
 if(!valid(prediction)||!valid(official)||key(prediction)!==key(official))
  return {status:'held_race_identity_mismatch',eligibleForCalibration:false};
 const scores=prediction?.response?.rankedScores;
 const racers=official?.racers;
 const six=x=>Array.isArray(x)&&x.length===6&&new Set(x.map(y=>Number(y.boat))).size===6&&x.every(y=>Number.isInteger(Number(y.boat))&&Number(y.boat)>=1&&Number(y.boat)<=6);
 if(!six(scores)||!six(racers))return {status:'held_six_boats_required',eligibleForCalibration:false};
 const ids=racers.map(x=>String(x?.racerId??''));
 if(ids.some(x=>!/^\d{4}$/.test(x))||new Set(ids).size!==6)
  return {status:'held_racer_identity_unverified',eligibleForCalibration:false};
 const inputs=prediction?.response?.scoreInputsByBoat;
 const originalInputsVerified=false; // Neither an unverified API field nor a later official snapshot proves model use.
 const officialCapturedAt=official?.receivedAt??official?.capturedAt??null;
 const predictionCapturedAt=prediction?.receivedAt??null;
 const timestampOrderKnown=Number.isFinite(Date.parse(officialCapturedAt))&&Number.isFinite(Date.parse(predictionCapturedAt));
 const officialCapturedBeforePrediction=timestampOrderKnown&&Date.parse(officialCapturedAt)<=Date.parse(predictionCapturedAt);
 const officialIdentityVerified=official?.status==='captured_research_inputs'&&racers.every(x=>x?.sourceVerified===true);
 const sourceProvenance={officialIdentityVerified,officialSourceUrl:official?.sourceUrl??null,
  officialResponseSha256:official?.responseSha256??null,
  predictionResponseSha256:prediction?.responseSha256??null};
 return {status:'retrospective_comparison_only',date:prediction.date,venue:Number(prediction.venue),race:Number(prediction.race),
  savedScoresPresent:true,explicitScoreInputsPresent:six(inputs),
  officialSixRacersPresent:true,officialCapturedAt,predictionCapturedAt,
  officialCapturedBeforePrediction,sourceProvenance,originalInputsVerified,
  independentPreRaceAuthentication:false,eligibleForCalibration:false,scoreChangeApplied:false};
}
