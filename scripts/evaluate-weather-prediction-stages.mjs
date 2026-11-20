// Research-only staged prediction labels. No speculative weather advantage is applied.
import {evaluateRace} from '../boat-score-2-scoring.js';
export function evaluateWeatherStages({selection,racers,weather=null,exhibition=null}){
 const base=evaluateRace(racers);
 const rank=results=>[...results].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(r=>r.boat);
 const morning=base.status==='evaluated'?{status:'evaluated',ranking:rank(base.racers),scores:base.racers}:{
  status:'insufficient_data',reason:base.status};
 const observedWeather=weather&&typeof weather==='object'&&
  ['windSpeed','waveHeight'].every(k=>Number.isFinite(weather[k])&&weather[k]>=0)&&
  typeof weather.windDirection==='string'&&weather.windDirection.length>0&&
  typeof weather.capturedAt==='string'&&Number.isFinite(Date.parse(weather.capturedAt));
 const weatherStage=observedWeather?{
  status:'observation_only_no_calibrated_adjustment',ranking:morning.ranking??null,
  weather:{windDirection:weather.windDirection,windSpeed:weather.windSpeed,waveHeight:weather.waveHeight,
   capturedAt:weather.capturedAt},reason:'venue_wind_course_effect_not_yet_validated'
 }:{status:'weather_missing_or_invalid',ranking:morning.ranking??null};
 const verifiedExhibition=exhibition?.verified===true&&
  Array.isArray(exhibition?.racers)&&exhibition.racers.length===6&&
  exhibition.racers.every((r,i)=>r.boat===i+1&&Number.isFinite(r.exhibitionScore)&&r.exhibitionScore>=0&&r.exhibitionScore<=100);
 const finalStage=verifiedExhibition?{
  status:'exhibition_available_recalibration_required',ranking:morning.ranking??null,
  reason:'exhibition_st_and_course_adjustments_require_separate_out_of_sample_validation'
 }:{status:'exhibition_missing_or_unverified',ranking:morning.ranking??null};
 return {status:'research_staged_predictions',selection,morning,weatherStage,finalStage,
  eligibleForDeployment:false,warning:'No wind/course performance coefficients are assumed. Rankings are unchanged until evidence supports adjustments.'};
}
