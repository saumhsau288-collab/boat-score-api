import {mapResearchDeadlineTableColumns} from './map-research-deadline-table-columns.mjs';
import {inspectResearchRequestedRaceUrl} from './inspect-research-requested-race-url.mjs';
// Read-only candidate. Both URL and official HTML table must agree.
// Does not independently authenticate the event date or deadline.
export function inspectResearchRaceCutoffCandidate({html,requestedUrl,responseUrl,race}={}){
 const url=inspectResearchRequestedRaceUrl({requestedUrl,responseUrl,race});
 const table=mapResearchDeadlineTableColumns(html);
 if(url.status!=='request_and_response_race_url_consistent_not_authenticated')
  return {status:'race_url_not_consistent',urlStatus:url.status,verified:false};
 if(table.status!=='table_columns_consistent_not_authenticated')
  return {status:'deadline_table_not_consistent',tableStatus:table.status,verified:false};
 const row=table.raceTimes.find(x=>x.race===race.race);
 if(!row)return {status:'race_deadline_missing',verified:false};
 return {status:'race_cutoff_candidate_needs_independent_authentication',date:race.date,venue:race.venue,race:race.race,localTimeJst:row.time,verified:false};
}
