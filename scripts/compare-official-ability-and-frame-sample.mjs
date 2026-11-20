// Research-only cross-source display. Boat number is a frame label, NOT proof of
// actual entry course. Finish rates are descriptive, not individual ability scores.
export function compareOfficialAbilityAndFrameSample(snapshot,finishComparison){
 if(snapshot?.status!=='captured_research_inputs'||snapshot?.source!=='verified_official_metrics'||
  !Array.isArray(snapshot.racers)||snapshot.racers.length!==6||
  snapshot.racers.some(r=>r.sourceVerified!==true)||
  finishComparison?.status!=='descriptive_finish_comparison'||
  !Array.isArray(finishComparison.racers)||finishComparison.racers.length!==6)
  return {status:'held',reason:'verified_official_and_six_finish_samples_required',scoreChangeApplied:false};
 const boats=new Set(),racers=[];
 for(const official of snapshot.racers){
  const boat=official.boat,finish=finishComparison.racers.find(r=>r.boat===boat);
  if(!Number.isInteger(boat)||boat<1||boat>6||boats.has(boat)||!finish||
   !Number.isInteger(finish.runs)||finish.runs<=0||
   ![official.nationalWinRate,official.localWinRate,official.motorTwoWinRate].every(Number.isFinite))
   return {status:'held',reason:'boat_or_metrics_invalid',scoreChangeApplied:false};
  boats.add(boat);
  racers.push({boat,racerId:String(official.racerId),officialName:official.name,
   nationalWinRate:official.nationalWinRate,
   localWinRate:official.localWinRate===0?official.nationalWinRate:official.localWinRate,
   localRateFallbackApplied:official.localWinRate===0,
   motorTwoWinRate:official.motorTwoWinRate,
   labelledFrameFinishSample:{runs:finish.runs,firstPlaceRate:finish.firstPlaceRate,
    top2Rate:finish.top2Rate,top3Rate:finish.top3Rate,
    firstPlaceWilson95:finish.firstPlaceWilson95,sampleSizeWarning:finish.sampleSizeWarning},
   averageST:null,averageSTVerified:false,
   entryCourse:null,entryCourseVerified:false,
   makulaboIdentityVerified:false});
 }
 return {status:'descriptive_cross_source_comparison',racers:racers.sort((a,b)=>a.boat-b.boat),
  officialMetricsVerified:true,makulaboIdentityVerified:false,
  scoreChangeApplied:false,eligibleForCalibration:false,
  note:'Same labelled frame does not prove same racer or actual entry course. Do not rank or tune weights until identity and timing are authenticated.'};
}
