// Research-only gate for historical prediction evaluation.
// Never call missing evidence a failed prediction or treat a current score as a saved pre-race prediction.
export function classifyHistoricalPredictionReview({evidenceAudit,savedPrediction,officialResult}={}){
 const missing=[];
 if(evidenceAudit?.status!=='evidence_fields_complete'||
    evidenceAudit?.readyForHistoricalCalibration!==true)
  missing.push('independently_authenticated_pre_race_inputs');
 if(savedPrediction?.preRaceVerified!==true||
    savedPrediction?.predictorVersionVerified!==true||
    !Array.isArray(savedPrediction?.rankedBoats)||savedPrediction.rankedBoats.length!==6||
    new Set(savedPrediction.rankedBoats).size!==6||
    savedPrediction.rankedBoats.some(b=>!Number.isInteger(b)||b<1||b>6))
  missing.push('saved_pre_race_predictor_output');
 if(officialResult?.sourceVerified!==true||
    !Array.isArray(officialResult?.finishOrder)||officialResult.finishOrder.length!==6||
    new Set(officialResult.finishOrder).size!==6||
    officialResult.finishOrder.some(b=>!Number.isInteger(b)||b<1||b>6))
  missing.push('verified_official_finish_order');
 const keys=[savedPrediction?.raceKey,officialResult?.raceKey,evidenceAudit?.raceKey];
 if(keys.some(k=>typeof k!=='string'||!/^[0-9]{8}-([0-9]{1,2})-([0-9]{1,2})$/.test(k))||
    new Set(keys).size!==1)missing.push('matching_race_identity');
 if(missing.length)return {status:'not_evaluable',missing,predictionMiss:false,
   eligibleForCalibration:false,scoreChangeApplied:false};
 const predicted=savedPrediction.rankedBoats,actual=officialResult.finishOrder;
 return {status:'evaluated_historical_prediction',raceKey:keys[0],
  predictedFirst:predicted[0],actualFirst:actual[0],
  firstPlaceHit:predicted[0]===actual[0],
  top3SetHit:predicted.slice(0,3).every(b=>actual.slice(0,3).includes(b)),
  exactTop3OrderHit:predicted.slice(0,3).every((b,i)=>b===actual[i]),
  predictionMiss:predicted[0]!==actual[0],
  eligibleForCalibration:false,scoreChangeApplied:false,
  note:'A verified historical comparison is not enough to authorize weight changes; use holdout validation.'};
}
