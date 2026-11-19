// Research-only venue/date/race selector. Downloads public official racelist, but never invents entry courses.
// Usage: node --experimental-default-type=module scripts/predict-selected-boat-race.mjs YYYYMMDD VENUE RACE [courses_csv]
import {fetchHistoricalRacelistSample} from './fetch-historical-racelist-sample.mjs';
import {extractArchivedRacerFeatures} from './extract-archived-racer-features.mjs';
import {predictFromInput} from './predict-boat-score-2-experiment.mjs';
import {summarizeVenueTendencies} from '../boat-score-2-venue-tendencies.js';
export async function predictSelectedRace({date,venue,race,courses=null,venueHistory=[],fetchImpl=fetch}){
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
  return {status:'invalid_selection',main:[],upset:[]};
 const entry=await fetchHistoricalRacelistSample({date,venue,race,fetchImpl});
 if(entry.status!=='raw_html_saved')return {status:'official_fetch_failed',date,venue,race,main:[],upset:[],error:entry.error};
 const features=extractArchivedRacerFeatures(entry);
 if(features.status!=='parsed_archival_features_unverified')return {status:'official_features_incomplete',date,venue,race,main:[],upset:[]};
 const usingAssumedEntry=courses===null;
 const selectedCourses=usingAssumedEntry?[1,2,3,4,5,6]:courses;
 if(!Array.isArray(selectedCourses)||selectedCourses.length!==6||selectedCourses.some(n=>!Number.isInteger(n)||n<1||n>6)||new Set(selectedCourses).size!==6)
  return {status:'invalid_entry_scenario',date,venue,race,main:[],upset:[],racers:features.racers};
 const racers=features.racers.map((x,i)=>({...x,boat:i+1,entryCourse:selectedCourses[i]}));
 const venueTendency=summarizeVenueTendencies(venueHistory).find(x=>x.venue===venue)??null;
 return {...predictFromInput({date,venue,race,racers,dataSource:'official_racelist_download_unverified_snapshot'}),
  entryScenario:usingAssumedEntry?'boat_order_assumption':'user_supplied_entry_scenario',
  entryCourses:selectedCourses,venueTendency,venueTendencyAppliedToScore:false,
  inputCaveat:usingAssumedEntry?'PROVISIONAL: Boat-order entry is assumed solely for scenario prediction. Actual entry is unverified; do not treat this as confirmed exhibition.':'Entry courses supplied as scenario, not authenticated exhibition or confirmed actual entry.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [date,venue,race,courseArg]=process.argv.slice(2);
 const courses=courseArg?courseArg.split(',').map(Number):null;
 const result=await predictSelectedRace({date,venue:Number(venue),race:Number(race),courses});
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='experimental')process.exitCode=2;
}
