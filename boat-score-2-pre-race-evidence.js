// Offline-only consolidated evidence for a six-racer pre-race snapshot.
// Keeps base scores separate from ST and Makulabo course evidence.
import {compareCourseEvidence} from './boat-score-2-course-evidence-comparison.js';
import {compareStartAndCourse} from './boat-score-2-start-course-comparison.js';
export function comparePreRaceEvidence(racers, evidenceByRacerId) {
 const course=compareCourseEvidence(racers,evidenceByRacerId);
 const start=compareStartAndCourse(racers);
 if(course.status==='invalid_race'||start.status==='invalid_race')
  return {status:'invalid_race',racers:[],scoreChangeApplied:false};
 const byBoat=new Map(start.racers.map(r=>[r.boat,r]));
 const combined=course.racers.map(r=>({...r,start:byBoat.get(r.boat)}));
 const ready=course.verifiedCourseCount===6&&start.status==='verified'&&
  course.baseScoresAvailable===6;
 return {status:ready?'evidence_complete':'evidence_incomplete',
  verifiedCourseCount:course.verifiedCourseCount,
  verifiedStartCount:start.racers.filter(r=>r.startVerified).length,
  baseScoresAvailable:course.baseScoresAvailable,
  racers:combined,scoreChangeApplied:false,
  note:'Comparison only. Do not train or change predictions without verified historical results.'};
}
