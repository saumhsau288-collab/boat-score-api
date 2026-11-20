#!/usr/bin/env node
// Report research capture readiness; do not fabricate recent-50 or claim pre-race authentication.
import fs from 'node:fs';
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';

export function reportResearchSnapshotReadiness(snapshot){
 const verified=snapshot?.status==='captured_research_inputs'&&snapshot?.source==='verified_official_metrics'&&
  Array.isArray(snapshot.racers)&&snapshot.racers.every(r=>r.sourceVerified===true)&&
  validateOfficialMetrics(snapshot.racers).verified;
 const boats=verified?snapshot.racers.map(r=>r.boat).sort((a,b)=>a-b):[];
 // A per-racer flag alone is not enough to run the morning scoring pipeline.
 // Require six distinct source-verified numeric records, matched by registration ID.
 const recentRecords=Array.isArray(snapshot?.verifiedRecent50Records)?snapshot.verifiedRecent50Records:[];
 const ids=verified?snapshot.racers.map(r=>String(r.racerId)):[];
 const recentById=new Map(recentRecords.map(r=>[String(r?.racerId),r]));
 const recent50Verified=verified&&recentRecords.length===6&&recentById.size===6&&
  ids.every(id=>{
   const r=recentById.get(id);
   return r?.verified===true&&r?.sourceVerified===true&&
    typeof r.winRate==='number'&&Number.isFinite(r.winRate)&&r.winRate>=0&&r.winRate<=100;
  });
 const coursesVerified=verified&&snapshot.racers.every(r=>r.entryCourseVerified===true);
 const prestartFieldsVerified=verified&&snapshot.racers.every(r=>
  r.entryCourseVerified===true&&Number.isInteger(r.entryCourse)&&r.entryCourse>=1&&r.entryCourse<=6&&
  r.startTimingVerified===true&&typeof r.startTiming==='number'&&Number.isFinite(r.startTiming)&&
  r.exhibitionTimeVerified===true&&typeof r.exhibitionTime==='number'&&Number.isFinite(r.exhibitionTime));
 const entryCourses=verified?snapshot.racers.map(r=>r.entryCourse):[];
 const uniqueEntryCoursesVerified=entryCourses.length===6&&new Set(entryCourses).size===6;
 const weatherVerified=snapshot?.weather?.verified===true&&snapshot.weather.sourceVerified===true&&
  typeof snapshot.weather.windSpeed==='number'&&Number.isFinite(snapshot.weather.windSpeed)&&snapshot.weather.windSpeed>=0;
 const prestartAuthenticated=snapshot?.preRaceIndependentlyVerified===true;
 const readyForResearchPrestartScoring=verified&&recent50Verified&&coursesVerified&&
  prestartFieldsVerified&&uniqueEntryCoursesVerified&&weatherVerified&&prestartAuthenticated;
 const missingPrestart=[];
 if(!verified)missingPrestart.push('six_verified_official_racers');
 if(!recent50Verified)missingPrestart.push('six_independently_verified_recent50_records');
 if(!coursesVerified)missingPrestart.push('six_verified_entry_courses');
 if(!prestartFieldsVerified)missingPrestart.push('six_verified_start_timing_and_exhibition');
 if(!uniqueEntryCoursesVerified)missingPrestart.push('six_unique_entry_courses');
 if(!weatherVerified)missingPrestart.push('verified_weather');
 if(!prestartAuthenticated)missingPrestart.push('independent_pre_race_authentication');
 const missing=[];
 if(!verified)missing.push('six_verified_official_racers');
 if(!recent50Verified)missing.push('six_independently_verified_recent50_records');
 if(!coursesVerified)missing.push('six_verified_entry_courses');
 if(snapshot?.preRaceIndependentlyVerified!==true)missing.push('independent_pre_race_authentication');
 return {status:verified?'official_six_ready':'official_six_not_ready',
  date:snapshot?.date??null,venue:snapshot?.venue??null,race:snapshot?.race??null,
  officialRacerCount:verified?6:0,boats,
  recent50Verified,coursesVerified,
  readyForResearchMorningScoring:verified&&recent50Verified,
  readyForResearchPrestartScoring,missingPrestart,
  eligibleForCalibration:false,missing,
  note:'Official feature capture alone does not establish a pre-race prediction or historical accuracy.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const path=process.argv[2];
 if(!path)throw Error('Usage: node scripts/report-research-snapshot-readiness.mjs snapshot.json');
 const report=reportResearchSnapshotReadiness(JSON.parse(fs.readFileSync(path,'utf8')));
 console.log(JSON.stringify(report));
 // This is a readiness report, not a capture gate. Incomplete inputs are not a CI failure.
}
