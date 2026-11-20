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
 // All timestamps must be explicit ISO instants; compare actual milliseconds, not strings.
 const parseTime=value=>typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
 const savedAt=parseTime(savedPrediction?.savedAt);
 const deadlineAt=parseTime(savedPrediction?.raceDeadlineAt);
 const officialDeadlineAt=parseTime(officialResult?.raceDeadlineAt);
 if(savedAt===null||deadlineAt===null||officialDeadlineAt===null||
    deadlineAt!==officialDeadlineAt||savedAt>=deadlineAt)
  missing.push('authenticated_prediction_before_official_deadline');
 const keys=[savedPrediction?.raceKey,officialResult?.raceKey,evidenceAudit?.raceKey];
 const match=typeof keys[0]==='string'?keys[0].match(/^(20\\d{6})-(\\d{1,2})-(\\d{1,2})$/):null;
 const date=match?.[1]??'',venue=Number(match?.[2]),race=Number(match?.[3]);
 const y=Number(date.slice(0,4)),m=Number(date.slice(4,6)),d=Number(date.slice(6,8));
 const validCalendar=Boolean(match)&&m>=1&&m<=12&&d>=1&&d<=31&&
  new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===
   date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8);
 if(!validCalendar||venue<1||venue>24||race<1||race>12)
  missing.push('valid_race_date_venue_and_number');
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
