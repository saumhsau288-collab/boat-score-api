// Research-only venue/date/race selector. Downloads public official racelist, but never invents entry courses.
// Usage: node --experimental-default-type=module scripts/predict-selected-boat-race.mjs YYYYMMDD VENUE RACE [courses_csv]
import {fetchHistoricalRacelistSample} from './fetch-historical-racelist-sample.mjs';
import {extractArchivedRacerFeatures} from './extract-archived-racer-features.mjs';
import {predictFromInput} from './predict-boat-score-2-experiment.mjs';
export async function predictSelectedRace({date,venue,race,courses=null,fetchImpl=fetch}){
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
  return {status:'invalid_selection',main:[],upset:[]};
 const entry=await fetchHistoricalRacelistSample({date,venue,race,fetchImpl});
 if(entry.status!=='raw_html_saved')return {status:'official_fetch_failed',date,venue,race,main:[],upset:[],error:entry.error};
 const features=extractArchivedRacerFeatures(entry);
 if(features.status!=='parsed_archival_features_unverified')return {status:'official_features_incomplete',date,venue,race,main:[],upset:[]};
 if(!Array.isArray(courses)||courses.length!==6||courses.some(n=>!Number.isInteger(n)||n<1||n>6)||new Set(courses).size!==6)
  return {status:'entry_prediction_required',date,venue,race,main:[],upset:[],racers:features.racers,
   message:'Official entry features fetched, but predicted entry courses are not verified. Provide six unique course numbers in boat order; do not substitute boat numbers silently.'};
 const racers=features.racers.map((x,i)=>({...x,boat:i+1,entryCourse:courses[i]}));
 return {...predictFromInput({date,venue,race,racers,dataSource:'official_racelist_download_unverified_snapshot'}),
  inputCaveat:'Entry courses supplied as scenario, not authenticated exhibition or confirmed actual entry.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [date,venue,race,courseArg]=process.argv.slice(2);
 const courses=courseArg?courseArg.split(',').map(Number):null;
 const result=await predictSelectedRace({date,venue:Number(venue),race:Number(race),courses});
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='experimental')process.exitCode=2;
}
