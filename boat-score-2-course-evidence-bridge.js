// Boat Score 2 research-only bridge: course-finish evidence is separate from base score.
// Never replace recent50WinRate or silently alter SCORE_WEIGHTS.
import {evaluateRacer} from './boat-score-2-scoring.js';
import {scoreCourseFinishEvidence} from './boat-score-2-course-finish-matrix.js';
export function evaluateRacerWithCourseEvidence(racer, evidence) {
 const base=evaluateRacer(racer);
 if(!evidence || evidence.verified!==true || evidence.courseAxisVerified!==true ||
    evidence.finishAxisVerified!==true || evidence.sampleSizeVerified!==true || evidence.racerId!==String(racer?.racerId??'') ||
    !Number.isInteger(evidence.course) || evidence.course!==racer?.predictedCourse)
  return {base,courseEvidence:{verified:false,reason:'course_identity_or_source_axes_not_verified'},combinedScore:null};
 const course=scoreCourseFinishEvidence(evidence.matrix,evidence.course,evidence.sampleSize);
 return {base,courseEvidence:course,combinedScore:null,
  note:'Course evidence is informational until validated historical calibration defines a weight.'};
}
