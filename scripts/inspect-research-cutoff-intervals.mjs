// Diagnostic only. Race intervals are not a hard rule: delays or interruptions happen.
export function inspectResearchCutoffIntervals(raceTimes,{largeGapMinutes=90,shortGapMinutes=5}={}){
 if(!Array.isArray(raceTimes)||raceTimes.length!==12||!raceTimes.every((x,i)=>x.race===i+1&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.time)))
  return {status:'invalid_race_times',verified:false};
 const minutes=raceTimes.map(x=>Number(x.time.slice(0,2))*60+Number(x.time.slice(3,5)));
 const intervals=minutes.slice(1).map((value,i)=>({fromRace:i+1,toRace:i+2,minutes:value-minutes[i]}));
 const anomalies=intervals.filter(x=>x.minutes<=0||x.minutes<shortGapMinutes||x.minutes>largeGapMinutes).map(x=>({...x,reason:x.minutes<=0?'non_increasing':x.minutes<shortGapMinutes?'unusually_short':'unusually_long'}));
 return {status:anomalies.length?'schedule_intervals_need_review':'schedule_intervals_plausible_not_authenticated',intervals,anomalies,verified:false,refreshAuthorized:false};
}
