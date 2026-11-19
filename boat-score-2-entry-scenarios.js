// Explicit scenario analysis. Default boat-order entry is an assumption, NOT an observed/predicted official entry.
import {predictFromInput} from './scripts/predict-boat-score-2-experiment.mjs';
export function compareEntryScenarios({date,venue,race,racers,scenarios}){
 if(!Array.isArray(racers)||racers.length!==6||!Array.isArray(scenarios)||scenarios.length<1||scenarios.length>12)
  return {status:'invalid_input',scenarios:[]};
 const results=scenarios.map((scenario,i)=>{
  const courses=scenario?.courses;
  if(!Array.isArray(courses)||courses.length!==6||courses.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(courses).size!==6)
   return {index:i,status:'invalid_entry_courses'};
  const mapped=racers.map((r,j)=>({...r,boat:j+1,entryCourse:courses[j]}));
  const result=predictFromInput({date,venue,race,racers:mapped,dataSource:'entry_scenario_assumption'});
  return {index:i,label:String(scenario.label??`scenario_${i+1}`).slice(0,80),status:result.status,
   courses,main:result.main,upset:result.upset,ranking:result.ranking,entryAlerts:result.entryAlerts};
 });
 return {status:'scenario_comparison_only',date,venue,race,scenarios:results,
  warning:'No entry scenario is verified or assigned a probability; compare assumptions only, not a prediction of actual entry.'};
}
