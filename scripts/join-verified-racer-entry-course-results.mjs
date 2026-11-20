// Research-only: link the actual starting course, racer identity and official finish.
// No assumption that boat number equals entry course.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
export function buildVerifiedRacerCourseResults(records){
 if(!Array.isArray(records))throw new TypeError('records_must_be_array');
 const rows=[],exclusions={};const seen=new Set();
 const reject=reason=>exclusions[reason]=(exclusions[reason]??0)+1;
 for(const r of records){
  const gate=verifyHistoricalRaceJoin(r);
  if(!gate.eligible){reject('race_join:'+gate.reason);continue;}
  const id=[r.expected.date,String(r.expected.venue).padStart(2,'0'),r.expected.race].join('|');
  if(seen.has(id)){reject('duplicate_race');continue;}
  const courses=r.entryCoursesByBoat;
  if(!Array.isArray(courses)||courses.length!==6||
   courses.some((c,i)=>c?.boat!==i+1||c?.verified!==true||
    !Number.isInteger(c.entryCourse)||c.entryCourse<1||c.entryCourse>6||
    String(c.racerId)!==String(r.scoreInputsByBoat[i].racerId))||
   new Set(courses.map(c=>c.entryCourse)).size!==6){reject('verified_racer_entry_course_missing');continue;}
  // Entry evidence must precede race start, but may be after betting cutoff.
  if(courses.some(c=>typeof c.capturedAt!=='string'||!Number.isFinite(Date.parse(c.capturedAt))||
    Date.parse(c.capturedAt)<gate.cutoffEpochMs)){reject('entry_course_timestamp_invalid');continue;}
  seen.add(id);
  for(let i=0;i<6;i++){
   const racerId=String(r.scoreInputsByBoat[i].racerId),finish=r.finishByBoat[i].finish;
   rows.push({date:String(r.expected.date),venue:String(r.expected.venue).padStart(2,'0'),
    race:r.expected.race,boat:i+1,racerId,entryCourse:courses[i].entryCourse,finish,
    winner:finish===1,podium:finish<=3,preRaceScore:r.scoreInputsByBoat[i].score});
  }
 }
 return {status:'verified_racer_entry_course_finish_join',races:rows.length/6,rows,exclusions,
  eligibleForDeployment:false};
}
export function summarizeRacerCoursePerformance(joined,{minimumStarts=10}={}){
 if(!Number.isInteger(minimumStarts)||minimumStarts<1)throw Error('invalid_minimum_starts');
 if(joined?.status!=='verified_racer_entry_course_finish_join')throw Error('verified_join_required');
 const groups=new Map();
 for(const row of joined.rows){
  const key=[row.venue,row.racerId,row.entryCourse].join('|');
  const g=groups.get(key)??{venue:row.venue,racerId:row.racerId,entryCourse:row.entryCourse,starts:0,wins:0,podiums:0};
  g.starts++;if(row.winner)g.wins++;if(row.podium)g.podiums++;
  groups.set(key,g);
 }
 return {status:'descriptive_racer_venue_course_performance',
  groups:[...groups.values()].map(g=>({...g,winRate:g.wins/g.starts,podiumRate:g.podiums/g.starts,
   sufficientSample:g.starts>=minimumStarts})).sort((a,b)=>a.venue.localeCompare(b.venue)||a.racerId.localeCompare(b.racerId)||a.entryCourse-b.entryCourse),
  eligibleForDeployment:false,
  warning:'Historical outcomes cannot be used as inputs for their own race. Use only earlier races to compute rolling racer/course rates.'};
}
