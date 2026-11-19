// Research-only audit of actual historical racer-course data coverage.
// A podium alone cannot establish the entry courses or racer identities of all six boats.
import fs from 'node:fs';
const isDate=d=>{
 if(typeof d!=='string'||!/^20\d{6}$/.test(d))return false;
 const y=+d.slice(0,4),m=+d.slice(4,6),day=+d.slice(6);
 const x=new Date(Date.UTC(y,m-1,day));
 return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===day;
};
export function auditHistoricalCourseInputs(rows,{asOfDate}={}){
 if(!Array.isArray(rows)||!isDate(asOfDate))throw Error('rows[] and valid asOfDate required');
 const byRace=new Map(),rejected={invalidRaceKey:0,notEarlier:0};
 for(const r of rows){
  if(!isDate(r?.date)||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||
   !Number.isInteger(r?.race)||r.race<1||r.race>12){rejected.invalidRaceKey++;continue;}
  if(r.date>=asOfDate){rejected.notEarlier++;continue;}
  const k=[r.date,r.venue,r.race].join(':');
  if(!byRace.has(k))byRace.set(k,[]);
  byRace.get(k).push(r);
 }
 const races=[...byRace].sort(([a],[b])=>a.localeCompare(b)).map(([key,entries])=>{
  const [date,venue,race]=key.split(':');
  const hasSix=entries.length===6;
  const boats=entries.map(r=>r.boat),courses=entries.map(r=>r.course),racers=entries.map(r=>r.racerId);
  const validBoats=hasSix&&boats.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(boats).size===6;
  const validCourses=hasSix&&courses.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(courses).size===6;
  const validRacers=hasSix&&racers.every(n=>typeof n==='string'&&/^[0-9]{4,6}$/.test(n))&&new Set(racers).size===6;
  const validFinishes=hasSix&&entries.every(r=>Number.isInteger(r.finish)&&r.finish>=1&&r.finish<=6)&&new Set(entries.map(r=>r.finish)).size===6;
  const provenance=hasSix&&entries.every(r=>r.historicalRecordVerified===true&&typeof r.sourceUrl==='string'&&
   (()=>{try{const u=new URL(r.sourceUrl);return u.protocol==='https:'&&(u.hostname==='boatrace.jp'||u.hostname.endsWith('.boatrace.jp'));}catch{return false;}})());
  const missing=[];
  if(!validBoats)missing.push('six_distinct_boat_numbers');
  if(!validCourses)missing.push('six_distinct_actual_entry_courses');
  if(!validRacers)missing.push('six_distinct_racer_ids');
  if(!validFinishes)missing.push('six_distinct_finish_positions');
  if(!provenance)missing.push('verified_official_provenance');
  return {date,venue:Number(venue),race:Number(race),recordCount:entries.length,complete:missing.length===0,missing};
 });
 return {method:'historical_course_input_coverage_audit',asOfDate,races,
  summary:{races:races.length,complete:races.filter(r=>r.complete).length,incomplete:races.filter(r=>!r.complete).length,rejected},
  eligibleForScoreChange:false,
  warning:'Provenance flags and URLs are assertions, not independent verification. No scoring update or verified accuracy claim; actual entry course cannot be inferred from boat number or podium.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,asOfDate,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/audit-historical-course-input.mjs <records.json> <YYYYMMDD> <report.json>');
 const result=auditHistoricalCourseInputs(JSON.parse(fs.readFileSync(input,'utf8')),{asOfDate});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.summary));
}
