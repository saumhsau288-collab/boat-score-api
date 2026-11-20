import {mapResearchDeadlineTableColumns} from './map-research-deadline-table-columns.mjs';
import {inspectResearchRequestedRaceUrl} from './inspect-research-requested-race-url.mjs';
import {inspectResearchDeadlineHeaderLinks} from './inspect-research-deadline-header-links.mjs';
// Compare separately fetched official race-list pages, without authorizing updates.
export function compareResearchOfficialRaceSchedules(pages,{date,venue}={}){
 if(!Array.isArray(pages)||pages.length<2)return {status:'insufficient_pages',verified:false};
 const schedules=[];
 for(const page of pages){
  const race={date,venue,race:page.race};
  const url=inspectResearchRequestedRaceUrl({requestedUrl:page.requestedUrl,responseUrl:page.responseUrl,race});
  const links=inspectResearchDeadlineHeaderLinks(page.html,{date,venue});
  const table=mapResearchDeadlineTableColumns(page.html);
  if(url.status!=='request_and_response_race_url_consistent_not_authenticated'||links.status!=='header_links_consistent_not_authenticated'||table.status!=='table_columns_consistent_not_authenticated')
   return {status:'page_evidence_inconsistent',race:page.race,urlStatus:url.status,linkStatus:links.status,tableStatus:table.status,verified:false};
  schedules.push({race:page.race,times:table.raceTimes.map(x=>x.time)});
 }
 const baseline=schedules[0].times;
 const conflicts=schedules.slice(1).filter(x=>x.times.some((time,i)=>time!==baseline[i])).map(x=>x.race);
 return {status:conflicts.length?'cross_page_schedule_conflict':'cross_page_schedule_consistent_not_authenticated',pageRaces:schedules.map(x=>x.race),conflicts,raceTimes:conflicts.length?undefined:baseline.map((time,i)=>({race:i+1,time})),verified:false,refreshAuthorized:false};
}
