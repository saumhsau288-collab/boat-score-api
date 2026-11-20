import {inspectResearchCutoffIntervals} from './inspect-research-cutoff-intervals.mjs';
// Research-only quarantine. Anomalous schedules remain observable but cannot
// be passed as eligible candidates to downstream refresh planning.
export function quarantineResearchAnomalousSchedule(schedule){
 if(!schedule||schedule.status!=='daily_candidates_not_authenticated'||!Array.isArray(schedule.candidates)||schedule.candidates.length!==12)
  return {status:'invalid_schedule',eligibleCandidates:[],quarantinedCandidates:[],refreshAuthorized:false};
 const raceTimes=schedule.candidates.map(c=>({race:c.race,time:c.cutoffCandidateJst}));
 const check=inspectResearchCutoffIntervals(raceTimes);
 if(check.status!=='schedule_intervals_plausible_not_authenticated')
  return {status:'schedule_quarantined',reason:check.status,anomalies:check.anomalies||[],eligibleCandidates:[],quarantinedCandidates:schedule.candidates,refreshAuthorized:false};
 return {status:'schedule_plausible_still_unverified',eligibleCandidates:schedule.candidates,quarantinedCandidates:[],refreshAuthorized:false,verified:false};
}
