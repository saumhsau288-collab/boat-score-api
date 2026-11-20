// Research-only gate: associate observed venue weather with a same-day course shift.
// Observations are descriptive; weather causation and predictive value remain unproven.
export function assessWeatherCourseShift(comparison, observations, targetCutoffAt, {
 minimumObservations=4,maxObservationAgeMinutes=90,windChangeThreshold=2
}={}){
 if(comparison?.status!=='venue_course_shift_comparison'||!Array.isArray(observations)||
  !Number.isFinite(Date.parse(targetCutoffAt))||
  !Number.isInteger(minimumObservations)||minimumObservations<2||
  !Number.isFinite(maxObservationAgeMinutes)||maxObservationAgeMinutes<=0||
  !Number.isFinite(windChangeThreshold)||windChangeThreshold<0)throw Error('invalid_weather_assessment_input');
 const cutoff=Date.parse(targetCutoffAt);
 const valid=observations.filter(o=>o?.verified===true&&
  String(o.venue).padStart(2,'0')===comparison.venue&&String(o.date)===comparison.date&&
  Number.isFinite(Date.parse(o.observedAt))&&Date.parse(o.observedAt)<cutoff&&
  Number.isFinite(o.windSpeed)&&o.windSpeed>=0&&
  Number.isFinite(o.waveHeight)&&o.waveHeight>=0&&
  typeof o.windDirection==='string'&&o.windDirection.length>0)
  .sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
 const latest=valid.at(-1);
 const fresh=!!latest&&cutoff-Date.parse(latest.observedAt)<=maxObservationAgeMinutes*60000;
 const windSpeeds=valid.map(o=>o.windSpeed);
 const windRange=windSpeeds.length?Math.max(...windSpeeds)-Math.min(...windSpeeds):null;
 const directionChanges=valid.length>1?valid.slice(1).filter((o,i)=>o.windDirection!==valid[i].windDirection).length:0;
 const weatherChangeObserved=valid.length>=minimumObservations&&fresh&&
  (windRange>=windChangeThreshold||directionChanges>0);
 const hasCourseShift=comparison.flaggedCourses.length>0;
 return {status:'research_weather_course_assessment',date:comparison.date,venue:comparison.venue,
  targetRace:comparison.targetRace,validWeatherObservations:valid.length,latestObservationAt:latest?.observedAt??null,
  weatherFresh:fresh,windSpeedRange:windRange,windDirectionChanges:directionChanges,
  flaggedCourses:comparison.flaggedCourses,
  weatherChangeObserved,courseShiftObserved:hasCourseShift,
  extraSixStatus:weatherChangeObserved&&hasCourseShift?'out_of_sample_validation_required':'no_weather_course_signal',
  extraSixPicks:[],weatherImpactConfirmed:false,eligibleForDeployment:false,
  warning:'Concurrent weather changes and course results do not prove a causal wind advantage. Verify same-day early-to-late predictive lift before issuing six extra picks.'};
}
