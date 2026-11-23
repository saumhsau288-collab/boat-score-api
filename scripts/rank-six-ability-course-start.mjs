// Research-only all-six ranking: separate ability, entry-course and ST signals.
// Ordinal comparisons are diagnostics, not probabilities or calibrated picks.
import {evaluateRace} from '../boat-score-2-scoring.js';
import {assessCourseStart} from './assess-course-start.mjs';
export function rankSixAbilityCourseStart(racers,{similarStartGap=0.02}={}){
 const ability=evaluateRace(racers);
 if(ability.status!=='evaluated')return {status:'insufficient_ability_data'};
 const comparison=assessCourseStart(racers,{similarStartGap});
 if(comparison.status!=='evaluated_research_only')
  return {status:'insufficient_course_start_data'};
 const byBoat=new Map(ability.racers.map(r=>[r.boat,r.score]));
 const rows=racers.map(r=>{
  const score=byBoat.get(r.boat);
  const strongerAbility=ability.racers.filter(x=>x.score>score).length;
  const fasterStart=racers.filter(x=>x.startTiming<r.startTiming).length;
  return {boat:r.boat,course:r.course,abilityScore:score,startTiming:r.startTiming,
   abilityRank:1+strongerAbility,courseRank:r.course,startRank:1+fasterStart};
 });
 const sortedByAbility=[...rows].sort((a,b)=>b.abilityScore-a.abilityScore||a.course-b.course||a.boat-b.boat);
 const sortedByStart=[...rows].sort((a,b)=>a.startTiming-b.startTiming||a.course-b.course||a.boat-b.boat);
 const sortedByCourse=[...rows].sort((a,b)=>a.course-b.course);
 const podiumCandidates={
  ability:sortedByAbility.slice(0,3).map(x=>x.boat),
  start:sortedByStart.slice(0,3).map(x=>x.boat),
  course:sortedByCourse.slice(0,3).map(x=>x.boat)
 };
 return {status:'research_only',rows:rows.sort((a,b)=>a.boat-b.boat),
  podiumCandidates,signals:{ability:sortedByAbility.map(x=>x.boat),
   start:sortedByStart.map(x=>x.boat),course:sortedByCourse.map(x=>x.boat)},
  calibrated:false,scoreAdjustment:0,
  warning:'Three different rankings are not independently validated trifecta prediction methods. Do not infer exact finishing order or hit rate.'};
}
