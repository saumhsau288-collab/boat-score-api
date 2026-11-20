// Research-only diagnostic of the six labelled finish rows. No racer ID or
// prediction score is assigned until the independent identity review succeeds.
export function describeMakulaboFinishSample(extracted){
 if(extracted?.verified!==true||!Array.isArray(extracted.parsedRows)||
    extracted.parsedRows.length!==6||
    new Set(extracted.parsedRows.map(r=>r.boat)).size!==6)
  return {status:'unavailable',reason:'verified_six_finish_rows_required'};
 const racers=extracted.parsedRows.map(r=>{
  const counts=r.counts;
  const valid=Number.isInteger(r.runs)&&r.runs>0&&
    Array.isArray(counts)&&counts.length===6&&
    counts.every(n=>Number.isInteger(n)&&n>=0)&&
    counts.reduce((a,b)=>a+b,0)===r.runs;
  return {boat:r.boat,sourceName:r.name,runs:r.runs,
    finishCountsValid:valid,finishCounts:valid?[...counts]:null,
    firstPlaceRate:valid?Math.round(10000*counts[0]/r.runs)/100:null,
    exactly50Runs:valid&&r.runs===50,
    sampleSizeWithin50:valid&&r.runs<=50};
 });
 return {status:'finish_sample_diagnostic',racers,
  allCountsValid:racers.every(r=>r.finishCountsValid),
  allExactly50Runs:racers.every(r=>r.exactly50Runs),
  allSampleSizesWithin50:racers.every(r=>r.sampleSizeWithin50),
  identityVerified:false,morningScoreApplied:false,eligibleForCalibration:false,
  note:'Finish-table sample sizes and counts do not prove a recent-50 sample, a course-specific rate, or a verified racer identity.'};
}
