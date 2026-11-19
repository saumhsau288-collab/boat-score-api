// Offline-only comparison of base rankings with course-specific evidence.
// Does not alter prediction weights or production behavior.
import {evaluateRacerWithCourseEvidence} from './boat-score-2-course-evidence-bridge.js';
export function compareCourseEvidence(racers, evidenceByRacerId) {
 if(!Array.isArray(racers)||racers.length!==6||
   new Set(racers.map(r=>r?.boat)).size!==6 ||
   racers.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6))
  return {status:'invalid_race',racers:[]};
 const result=racers.map(r=>{
  const e=evidenceByRacerId?.[String(r.racerId)];
  const x=evaluateRacerWithCourseEvidence(r,e);
  return {boat:r.boat,racerId:String(r.racerId??''),baseScore:x.base.score??null,
   baseStatus:x.base.status,courseEvidence:x.courseEvidence};
 });
 const verified=result.filter(r=>r.courseEvidence.verified).length;
 return {status:verified===6?'six_courses_verified':'partial_or_unverified',
  verifiedCourseCount:verified,baseScoresAvailable:result.filter(r=>r.baseStatus==='evaluated').length,
  racers:result,scoreChangeApplied:false,
  note:'Evidence comparison only; historical validation is required before weighting.'};
}
