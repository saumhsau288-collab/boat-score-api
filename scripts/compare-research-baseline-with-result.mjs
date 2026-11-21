// Research-only comparison of the official 85-point component with an independently
// verified official finish. This is a retrospective diagnostic, not a forecast.
export function compareResearchBaselineWithResult(baseline,officialResult){
 if(baseline?.status!=='research_official_component_comparison'||
  !Array.isArray(baseline.rows)||baseline.rows.length!==6||
  baseline.scoreChangeApplied!==false)
  return {status:'held',reason:'valid_official_component_baseline_required',eligibleForCalibration:false};
 const byBoat=new Map();
 for(const row of baseline.rows){
  if(!Number.isInteger(row?.boat)||row.boat<1||row.boat>6||byBoat.has(row.boat)||
   !Number.isFinite(row.officialComponentScore85)||row.officialComponentScore85<0||row.officialComponentScore85>85)
   return {status:'held',reason:'invalid_component_scores',eligibleForCalibration:false};
  byBoat.set(row.boat,row);
 }
 const finish=officialResult?.finishOrder;
 if(officialResult?.verified!==true||!Array.isArray(finish)||finish.length!==6||
  new Set(finish).size!==6||finish.some(n=>!byBoat.has(n)))
  return {status:'held',reason:'independently_verified_six_boat_finish_required',eligibleForCalibration:false};
 if(String(officialResult.date)!==String(baseline.date)||
  Number(officialResult.venue)!==Number(baseline.venue)||
  Number(officialResult.race)!==Number(baseline.race))
  return {status:'held',reason:'race_identity_mismatch',eligibleForCalibration:false};
 const ranked=[...baseline.rows].sort((a,b)=>b.officialComponentScore85-a.officialComponentScore85||a.boat-b.boat);
 const actualRank=new Map(finish.map((boat,i)=>[boat,i+1]));
 return {status:'retrospective_comparison',date:baseline.date,venue:baseline.venue,race:baseline.race,
  componentRankedBoats:ranked.map(r=>r.boat),actualFinishBoats:finish.slice(),
  topComponentBoat:ranked[0].boat,actualWinnerBoat:finish[0],
  topComponentBoatWon:ranked[0].boat===finish[0],
  topComponentBoatPodium:finish.slice(0,3).includes(ranked[0].boat),
  rows:ranked.map((r,i)=>({boat:r.boat,componentRank:i+1,officialComponentScore85:r.officialComponentScore85,actualFinish:actualRank.get(r.boat)})),
  eligibleForCalibration:false,preRaceIndependentlyVerified:false,
  note:'Retrospective 85-point component comparison only. Does not establish pre-race prediction accuracy or justify changing weights.'};
}
