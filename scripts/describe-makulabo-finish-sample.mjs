// Research-only diagnostic of the six labelled finish rows. No racer ID or
// prediction score is assigned until the independent identity review succeeds.
// Wilson 95% interval for descriptive first-place proportion; not a forecast.
function wilson95(wins,runs){
 const z=1.96,p=wins/runs,z2=z*z,den=1+z2/runs;
 const center=(p+z2/(2*runs))/den;
 const margin=z*Math.sqrt(p*(1-p)/runs+z2/(4*runs*runs))/den;
 return {lowerPercent:Math.round(Math.max(0,center-margin)*10000)/100,
  upperPercent:Math.round(Math.min(1,center+margin)*10000)/100};
}
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
    top2Rate:valid?Math.round(10000*(counts[0]+counts[1])/r.runs)/100:null,
    top3Rate:valid?Math.round(10000*(counts[0]+counts[1]+counts[2])/r.runs)/100:null,
    firstPlaceWilson95:valid?wilson95(counts[0],r.runs):null,
    top2Wilson95:valid?wilson95(counts[0]+counts[1],r.runs):null,
    top3Wilson95:valid?wilson95(counts[0]+counts[1]+counts[2],r.runs):null,
    exactly50Runs:valid&&r.runs===50,
    sampleSizeWithin50:valid&&r.runs<=50,
    sampleSizeWarning:!valid?'invalid_counts':r.runs<10?'very_small_sample':r.runs<30?'small_sample':null};
 });
 return {status:'finish_sample_diagnostic',racers,
  allCountsValid:racers.every(r=>r.finishCountsValid),
  allExactly50Runs:racers.every(r=>r.exactly50Runs),
  allSampleSizesWithin50:racers.every(r=>r.sampleSizeWithin50),
  lowSampleBoats:racers.filter(r=>r.sampleSizeWarning==='very_small_sample'||r.sampleSizeWarning==='small_sample').map(r=>r.boat),
  identityVerified:false,morningScoreApplied:false,eligibleForCalibration:false,
  note:'Wilson intervals describe sampling uncertainty, not future win probabilities. Frame scope, racer identity and pre-race timing require separate evidence.'};
}
