// Research-only combined diagnostics; no probability estimates or production changes.
import {evaluateRace} from '../boat-score-2-scoring.js';
import {assessCourseStart} from './assess-course-start.mjs';
export function classifyAbilityCourseStart(racers,{similarStartGap=0.02,abilityGap=12}={}){
 if(!Number.isFinite(abilityGap)||abilityGap<0||abilityGap>100)return {status:'invalid_threshold'};
 const ability=evaluateRace(racers);
 if(ability.status!=='evaluated')return {status:'insufficient_ability_data',abilityStatus:ability.status};
 const courseStart=assessCourseStart(racers,{similarStartGap});
 if(courseStart.status!=='evaluated_research_only')
  return {status:'insufficient_course_start_data',courseStartStatus:courseStart.status};
 const scores=new Map(ability.racers.map(r=>[r.boat,r.score]));
 const byCourse=[...racers].sort((a,b)=>a.course-b.course);
 const inner=byCourse[0],outer=byCourse.slice(1);
 const bestOutside=[...outer].sort((a,b)=>scores.get(b.boat)-scores.get(a.boat)||a.course-b.course)[0];
 const abilityDifference=Number((scores.get(inner.boat)-scores.get(bestOutside.boat)).toFixed(2));
 const startDifference=Number((inner.startTiming-bestOutside.startTiming).toFixed(3));
 const insideAbilityStrong=abilityDifference>=abilityGap;
 const outsideAbilityStrong=abilityDifference<=-abilityGap;
 const outsideStartFaster=startDifference>similarStartGap;
 const insideStartFaster=startDifference< -similarStartGap;
 const category=insideAbilityStrong&&!outsideStartFaster?'inside_supported':
  outsideAbilityStrong&&outsideStartFaster?'outside_counter_candidate':
  outsideAbilityStrong?'outside_ability_candidate':
  insideAbilityStrong?'conflicting_signals':'uncertain';
 return {status:'research_only',category,insideBoat:inner.boat,
  strongestOutsideBoat:bestOutside.boat,abilityDifference,startDifference,
  insideAbilityStrong,outsideAbilityStrong,outsideStartFaster,insideStartFaster,
  calibrated:false,scoreAdjustment:0,
  warning:'Compares first entry course with strongest outside racer only. Other five boats and race dynamics may change outcomes; no production score changes.'};
}
