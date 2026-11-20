import {mapResearchDeadlineTableColumns} from './map-research-deadline-table-columns.mjs';
import {inspectResearchRequestedRaceUrl} from './inspect-research-requested-race-url.mjs';
// Read-only candidate schedule for all twelve races, never authorizes a refresh.
export function buildResearchDailyRefreshCandidates({html,requestedUrl,responseUrl,race}={}){
 const url=inspectResearchRequestedRaceUrl({requestedUrl,responseUrl,race});
 const table=mapResearchDeadlineTableColumns(html);
 if(url.status!=='request_and_response_race_url_consistent_not_authenticated')
  return {status:'race_url_not_consistent',refreshAuthorized:false};
 if(table.status!=='table_columns_consistent_not_authenticated')
  return {status:'deadline_table_not_consistent',refreshAuthorized:false};
 const date=String(race?.date??'');
 if(!/^20\d{6}$/.test(date))return {status:'invalid_date',refreshAuthorized:false};
 const year=Number(date.slice(0,4)),month=Number(date.slice(4,6)),day=Number(date.slice(6,8));
 const check=new Date(Date.UTC(year,month-1,day));
 if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)
  return {status:'invalid_calendar_date',refreshAuthorized:false};
 const candidates=table.raceTimes.map(({race:raceNo,time})=>{
  const [hour,minute]=time.split(':').map(Number);
  const cutoff=new Date(Date.UTC(year,month-1,day,hour-9,minute));
  return {race:raceNo,cutoffCandidateJst:time,refreshCandidateAt:new Date(cutoff.getTime()-600000).toISOString(),verified:false,refreshAuthorized:false};
 });
 return {status:'daily_candidates_not_authenticated',date,venue:race.venue,candidates,verified:false,refreshAuthorized:false};
}
