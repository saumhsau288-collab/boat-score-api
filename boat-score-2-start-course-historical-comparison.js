// Offline-only comparison: existing 100-point score versus a separately specified
// ST/course adjustment. No production prediction or scoring changes.
import {evaluateRace} from './boat-score-2-scoring.js';
import {compareStartAndCourse} from './boat-score-2-start-course-comparison.js';
const order = (xs) => [...xs].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
const validFinish = a => Array.isArray(a)&&a.length===6&&new Set(a).size===6&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
const result = (rank,finish) => ({winnerHit:rank[0]===finish[0],topThreeSetHit:rank.slice(0,3).every(x=>finish.slice(0,3).includes(x)),rank});
export function compareHistoricalStartCourse(rows,{stPoints=5,coursePoints=5}={}){
 if(!Array.isArray(rows)||![stPoints,coursePoints].every(x=>Number.isFinite(x)&&x>=0&&x<=20))
  return {status:'invalid_input'};
 const comparisons=[],excluded=[];
 for(const row of rows){
  const key=[row?.date,row?.venue,row?.race].join(':');
  if(row?.preRaceSnapshot!==true||row?.resultVerified!==true||!validFinish(row.finishOrder)||
     !/^20\\d{6}$/.test(String(row.date))||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||
     !Number.isInteger(row.race)||row.race<1||row.race>12){
   excluded.push({key,reason:'unverified_race'});continue;
  }
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
