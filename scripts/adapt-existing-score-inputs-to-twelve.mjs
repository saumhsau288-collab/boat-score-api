// Research-only adapter for existing Boat Score 2 per-boat score input names.
// Do not infer entry course, exhibition time, or course-specific last50 podium
// from unrelated summary metrics (exhibitionScore / recent50WinRate).
import {auditTwelveMethodReadiness} from './audit-twelve-method-readiness.mjs';
const finite=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function adaptExistingScoreInputsToTwelve(snapshot){
 if(!snapshot||!Array.isArray(snapshot.racers))throw Error('racers[] required');
 const racers=snapshot.racers.map(r=>({
  boat:r.boat,
  entryCourse:finite(r.entryCourse),
  nationalWinRate:finite(r.nationalWinRate),
  localWinRate:finite(r.localWinRate),
  averageStartTiming:finite(r.averageStartTiming),
  motorTwoRate:finite(r.motorTwoRate)??finite(r.motorTwoWinRate),
  exhibitionTime:finite(r.exhibitionTime),
  last50CoursePodiumRate:finite(r.last50CoursePodiumRate)
 }));
 const adapted={...snapshot,racers};
 const readiness=auditTwelveMethodReadiness([adapted]);
 return {snapshot:adapted,readiness:readiness.rows[0],
  mappedMotorField:racers.filter(r=>r.motorTwoRate!==null).length,
  warnings:['Entry course must come from pre-race entry evidence; do not assume boat=course.',
   'recent50WinRate is not last50CoursePodiumRate.',
   'exhibitionScore is not exhibitionTime.',
   'Mapping is structural only and does not authenticate sources or capture timing.']};
}
