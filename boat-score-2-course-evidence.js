// Offline-only course-specific evaluation, separate from individual racer ability.
// Never treat boat number as a verified entry course, or overall win rate as course win rate.
const pct=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
export function evaluateCourseEvidence(input){
  if(!input||!Number.isInteger(input.boat)||input.boat<1||input.boat>6||!/^[0-9]{4}$/.test(String(input.racerId??'')))
    return {status:'invalid_identity'};
  if(input.entryCourseVerified!==true||!Number.isInteger(input.entryCourse)||input.entryCourse<1||input.entryCourse>6)
    return {status:'missing_verified_entry_course',boat:input.boat,racerId:String(input.racerId)};
  const {courseFirstRate,courseSecondRate,courseThirdRate,courseSampleSize}=input;
  if(![courseFirstRate,courseSecondRate,courseThirdRate].every(pct)||!Number.isInteger(courseSampleSize)||courseSampleSize<1)
    return {status:'missing_course_specific_history',boat:input.boat,racerId:String(input.racerId),entryCourse:input.entryCourse};
  if(courseFirstRate+courseSecondRate+courseThirdRate>100.00001)
    return {status:'invalid_course_rates'};
  if(input.courseHistoryVerified!==true||input.courseHistoryRacerId!==String(input.racerId)||input.courseHistoryCourse!==input.entryCourse)
    return {status:'course_history_identity_unverified'};
  return {status:'evaluated',boat:input.boat,racerId:String(input.racerId),entryCourse:input.entryCourse,courseSampleSize,
    firstRate:courseFirstRate,secondRate:courseSecondRate,thirdRate:courseThirdRate,
    podiumRate:courseFirstRate+courseSecondRate+courseThirdRate,
    evidenceOnly:true};
}
export function evaluateAbilityAndCourse(racer,abilityEvaluator){
  const ability=abilityEvaluator(racer);
  const course=evaluateCourseEvidence(racer);
  return {boat:racer?.boat,racerId:String(racer?.racerId??''),ability,course,
    combinedScore:null,reason:'Course-specific evidence must remain independent until verified calibration; no implicit substitution or guessed weights'};
}
