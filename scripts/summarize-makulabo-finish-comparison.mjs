// Research-only comparison of labelled finish counts, never a prediction or a score update.
// Keep first, top-two and top-three rates separate and retain the underlying sample size.
export function summarizeMakulaboFinishComparison(diagnostic){
 if(diagnostic?.status!=='finish_sample_diagnostic'||diagnostic.allCountsValid!==true||
  !Array.isArray(diagnostic.racers)||diagnostic.racers.length!==6||
  new Set(diagnostic.racers.map(r=>r.boat)).size!==6)
  return {status:'held',reason:'six_valid_finish_samples_required',eligibleForCalibration:false};
 const racers=diagnostic.racers.map(r=>({
  boat:r.boat,sourceName:r.sourceName,runs:r.runs,
  firstPlaceRate:r.firstPlaceRate,top2Rate:r.top2Rate,top3Rate:r.top3Rate,
  firstPlaceWilson95:r.firstPlaceWilson95,top2Wilson95:r.top2Wilson95,
  top3Wilson95:r.top3Wilson95,sampleSizeWarning:r.sampleSizeWarning,
  descriptiveOnly:true
 }));
 const sortBy=field=>[...racers].sort((a,b)=>b[field]-a[field]||b.runs-a.runs||a.boat-b.boat)
  .map(r=>({boat:r.boat,runs:r.runs,rate:r[field],sampleSizeWarning:r.sampleSizeWarning}));
 return {status:'descriptive_finish_comparison',racers,
  rankings:{firstPlace:sortBy('firstPlaceRate'),top2:sortBy('top2Rate'),top3:sortBy('top3Rate')},
  smallSampleBoats:diagnostic.lowSampleBoats??[],
  eligibleForCalibration:false,morningScoreApplied:false,
  note:'Ranking is descriptive only; frame-specific sample sizes differ, identity review and pre-race provenance are separate.'};
}
