import {classifyHistoricalPredictionReview} from './classify-historical-prediction-review.mjs';
// Research-only batch summary. Missing-evidence races never enter accuracy denominators.
export function summarizeHistoricalPredictionReviews(records){
 if(!Array.isArray(records))return {status:'invalid_input'};
 const seen=new Set(),reviews=[];
 for(const record of records){
  const result=classifyHistoricalPredictionReview(record);
  const key=result.raceKey??record?.savedPrediction?.raceKey??record?.officialResult?.raceKey??null;
  // Duplicate keys are excluded entirely, rather than counted as separate races.
  reviews.push({raceKey:key,...result});
  if(typeof key==='string')seen.add(key);
 }
 const counts=new Map();
 for(const r of reviews)if(typeof r.raceKey==='string')counts.set(r.raceKey,(counts.get(r.raceKey)??0)+1);
 const unique=reviews.map(r=>counts.get(r.raceKey)>1?
  {...r,status:'not_evaluable',missing:['duplicate_race_key'],predictionMiss:false}:r);
 const valid=unique.filter(r=>r.status==='evaluated_historical_prediction');
 const hits=field=>valid.filter(r=>r[field]===true).length;
 const pct=n=>valid.length?Math.round(n/valid.length*10000)/100:null;
 return {status:'research_batch_summary',total:records.length,evaluable:valid.length,
  notEvaluable:unique.length-valid.length,
  firstPlaceHits:hits('firstPlaceHit'),top3SetHits:hits('top3SetHit'),
  exactTop3OrderHits:hits('exactTop3OrderHit'),
  firstPlaceHitRatePercent:pct(hits('firstPlaceHit')),
  top3SetHitRatePercent:pct(hits('top3SetHit')),
  exactTop3OrderHitRatePercent:pct(hits('exactTop3OrderHit')),
  reviews:unique,eligibleForCalibration:false,scoreChangeApplied:false,
  note:'Only independently verified pre-race outputs with verified outcomes count. No weight tuning.'};
}
