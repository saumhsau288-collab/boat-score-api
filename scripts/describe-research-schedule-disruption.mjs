// Research-only diagnostic: classify schedules with a possible disruption.
// Never invent corrected times or authorize refreshes.
export function describeResearchScheduleDisruption(quarantine){
 if(!quarantine||quarantine.status!=='schedule_quarantined')
  return {status:'no_quarantined_schedule',verified:false};
 const anomalies=quarantine.anomalies||[];
 const long=anomalies.filter(x=>x.reason==='unusually_long');
 const short=anomalies.filter(x=>x.reason==='unusually_short');
 const nonIncreasing=anomalies.filter(x=>x.reason==='non_increasing');
 const possibleDisruption=long.length>0&&short.length>0;
 return {status:possibleDisruption?'possible_schedule_disruption_needs_official_confirmation':'anomalous_schedule_needs_official_confirmation',longGaps:long.length,shortGaps:short.length,nonIncreasing:nonIncreasing.length,possibleDisruption,correctedTimes:null,verified:false,refreshAuthorized:false};
}
