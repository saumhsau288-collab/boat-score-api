// Read-only research gate. Never authorizes refresh, even for future candidates.
export function classifyResearchCandidateTiming(schedule,observedAt){
 const now=Date.parse(observedAt);
 if(!Number.isFinite(now)||!schedule||!Array.isArray(schedule.candidates)||schedule.candidates.length!==12)
  return {status:'invalid_timing_evidence',verified:false,refreshAuthorized:false,entries:[]};
 const entries=schedule.candidates.map(c=>{
  const refresh=Date.parse(c.refreshCandidateAt);
  if(!Number.isFinite(refresh)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(c.refreshCandidateAt||''))
   return {race:c.race,status:'invalid_refresh_time'};
  const remainingMinutes=Math.round((refresh-now)/60000);
  return {race:c.race,status:refresh<=now?'refresh_window_already_passed':'refresh_window_in_future',remainingMinutes};
 });
 return {status:entries.some(x=>x.status==='invalid_refresh_time')?'invalid_timing_evidence':'timing_classified_not_authenticated',observedAt:new Date(now).toISOString(),entries,verified:false,refreshAuthorized:false};
}
