// Offline evidence audit only. Do not infer start timing from a finish table,
// and do not assume boat number is the verified entry course.
export function auditAbilityStartCourseEvidence(abilityComparison,startCourseComparison){
 if(abilityComparison?.status!=='descriptive_cross_source_comparison'||
  !Array.isArray(abilityComparison.racers)||abilityComparison.racers.length!==6)
  return {status:'held',reason:'official_ability_comparison_required',scoreChangeApplied:false};
 const starts=startCourseComparison?.racers;
 const validStarts=Array.isArray(starts)&&starts.length===6&&
  new Set(starts.map(r=>r.boat)).size===6;
 const racers=abilityComparison.racers.map(r=>{
  const start=validStarts?starts.find(x=>x.boat===r.boat):null;
  const verifiedST=start?.startVerified===true&&Number.isFinite(start.averageST);
  // A predicted course is a scenario, not a verified entry.
  const courseVerified=start?.entryCourseVerified===true&&
   Number.isInteger(start.course)&&start.course>=1&&start.course<=6;
  const missing=[];
  if(!verifiedST)missing.push('verified_pre_race_average_st');
  if(!courseVerified)missing.push('verified_entry_course');
  if(r.makulaboIdentityVerified!==true)missing.push('verified_makulabo_identity');
  return {boat:r.boat,racerId:r.racerId,nationalWinRate:r.nationalWinRate,
   localWinRate:r.localWinRate,motorTwoWinRate:r.motorTwoWinRate,
   averageST:verifiedST?start.averageST:null,
   entryCourse:courseVerified?start.course:null,
   labelledFrameFinishSample:r.labelledFrameFinishSample,
   missing,readyForHistoricalCalibration:missing.length===0};
 });
 return {status:racers.every(r=>r.readyForHistoricalCalibration)?'evidence_fields_complete':'incomplete_evidence',
  racers,verifiedStartCount:racers.filter(r=>r.averageST!==null).length,
  verifiedCourseCount:racers.filter(r=>r.entryCourse!==null).length,
  readyForHistoricalCalibration:false,scoreChangeApplied:false,
  note:'Field completeness alone never proves independent pre-race availability or licenses calibration.'};
}
