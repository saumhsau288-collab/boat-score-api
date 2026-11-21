// Offline-only comparison: existing 100-point score versus a separately specified
// ST/course adjustment. No production prediction or scoring changes.
import {evaluateRace} from './boat-score-2-scoring.js';
import {compareStartAndCourse} from './boat-score-2-start-course-comparison.js';
const order = (xs) => [...xs].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
const explicitInstant = value => typeof value==='string' &&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
 ? Date.parse(value) : NaN;
const validCalendarDate = value => {
 const d=String(value??'');
 if(!/^20\d{6}$/.test(d))return false;
 const parsed=new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`);
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10).replaceAll('-','')===d;
};
const validFinish = a => Array.isArray(a)&&a.length===6&&new Set(a).size===6&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
const result = (rank,finish) => ({winnerHit:rank[0]===finish[0],topThreeSetHit:rank.slice(0,3).every(x=>finish.slice(0,3).includes(x)),rank});
export function compareHistoricalStartCourse(rows,{stPoints=5,coursePoints=5}={}){
 if(!Array.isArray(rows)||![stPoints,coursePoints].every(x=>Number.isFinite(x)&&x>=0&&x<=20))
  return {status:'invalid_input'};
 const comparisons=[],excluded=[];
 const seen=new Set();
 for(const row of rows){
  const key=[row?.date,row?.venue,row?.race].join(':');
  if(row?.preRaceSnapshot!==true||row?.resultVerified!==true||!validFinish(row.finishOrder)||
     !validCalendarDate(row.date)||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||
     !Number.isInteger(row.race)||row.race<1||row.race>12){
   excluded.push({key,reason:'unverified_race'});continue;
  }
  if(row?.officialResultSourceVerified!==true||row?.raceIdentityVerified!==true){
   excluded.push({key,reason:'unverified_official_result_identity'});continue;
  }
  // Boolean flags alone cannot establish a pre-deadline, official race join.
  const captured=explicitInstant(row.capturedAt),cutoff=explicitInstant(row.officialCutoffAt);
  if(row.officialCutoffVerified!==true||!Number.isFinite(captured)||!Number.isFinite(cutoff)||captured>=cutoff){
   excluded.push({key,reason:'unverified_pre_deadline_cutoff'});continue;
  }
  if(seen.has(key)){excluded.push({key,reason:'duplicate_race'});continue;}
  const base=evaluateRace(row.racers),evidence=compareStartAndCourse(row.racers);
  if(base.status!=='evaluated'||evidence.status!=='verified'){
   excluded.push({key,reason:'missing_pre_race_evidence'});continue;
  }
  // The course term is an experimental *position* prior, not a claim about a
  // particular racer. No boat-number substitution for predicted entry course.
  const adjusted=base.racers.map(r=>{
   const e=evidence.racers.find(x=>x.boat===r.boat);
   const stBonus=stPoints*(1-e.averageST);
   const courseBonus=coursePoints*(6-e.course)/5;
   return {boat:r.boat,score:r.score+stBonus+courseBonus};
  });
  seen.add(key);
  comparisons.push({key,baseline:result(order(base.racers),row.finishOrder),
   candidate:result(order(adjusted),row.finishOrder)});
 }
 const count=(field,metric)=>comparisons.filter(x=>x[field][metric]).length;
 return {status:'evaluated',total:rows.length,eligible:comparisons.length,excluded:excluded.length,
  baseline:{winnerHits:count('baseline','winnerHit'),topThreeSetHits:count('baseline','topThreeSetHit')},
  candidate:{winnerHits:count('candidate','winnerHit'),topThreeSetHits:count('candidate','topThreeSetHit')},
  comparisons,excludedDetails:excluded,
  warning:'Exploratory in-sample comparison only; not a holdout validation or evidence of improvement.'};
}
