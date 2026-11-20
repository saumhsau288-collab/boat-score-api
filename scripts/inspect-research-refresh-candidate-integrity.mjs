// Research-only integrity check. Does not authenticate official data or authorize updates.
export function inspectResearchRefreshCandidateIntegrity(schedule){
 if(!schedule||schedule.status!=='daily_candidates_not_authenticated'||!/^20\d{6}$/.test(String(schedule.date))||!Number.isInteger(Number(schedule.venue))||!Array.isArray(schedule.candidates)||schedule.candidates.length!==12)
  return {status:'invalid_candidate_schedule',issues:['invalid_schedule'],verified:false,refreshAuthorized:false};
 const date=String(schedule.date);
 const year=Number(date.slice(0,4)),month=Number(date.slice(4,6)),day=Number(date.slice(6,8));
 const calendar=new Date(Date.UTC(year,month-1,day));
 const issues=[];
 if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||calendar.getUTCDate()!==day)issues.push('invalid_calendar_date');
 for(let i=0;i<12;i++){
  const candidate=schedule.candidates[i];
  if(!candidate||candidate.race!==i+1||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.cutoffCandidateJst||'')){issues.push('race_'+(i+1)+'_invalid_identity_or_time');continue;}
  const [hour,minute]=candidate.cutoffCandidateJst.split(':').map(Number);
  const expected=new Date(Date.UTC(year,month-1,day,hour-9,minute-10)).toISOString();
  if(candidate.refreshCandidateAt!==expected)issues.push('race_'+(i+1)+'_refresh_time_mismatch');
  if(candidate.verified!==false||candidate.refreshAuthorized!==false)issues.push('race_'+(i+1)+'_unauthorized_flag');
 }
 return {status:issues.length?'candidate_integrity_failed':'candidate_integrity_consistent_not_authenticated',issues,verified:false,refreshAuthorized:false};
}
