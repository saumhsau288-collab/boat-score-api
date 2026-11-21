// Research-only identity cross-check between saved official racelist and parsed
// official result HTML. Parsed results remain unverified until independent review.
export function crossCheckOfficialResultIdentity(snapshot,parsed){
 if(snapshot?.status!=='captured_research_inputs'||snapshot?.source!=='verified_official_metrics'||
  !Array.isArray(snapshot.racers)||snapshot.racers.length!==6||
  snapshot.racers.some(r=>r.sourceVerified!==true))
  return {status:'held',reason:'verified_official_racelist_required',eligibleForCalibration:false};
 if(parsed?.status!=='parsed_needs_independent_review'||!Array.isArray(parsed.racers)||parsed.racers.length!==6)
  return {status:'held',reason:'parsed_official_result_six_required',eligibleForCalibration:false};
 if(String(snapshot.date)!==String(parsed.date)||Number(snapshot.venue)!==Number(parsed.venue)||
  Number(snapshot.race)!==Number(parsed.race))
  return {status:'held',reason:'race_identity_mismatch',eligibleForCalibration:false};
 const official=new Map();
 for(const r of snapshot.racers){
  if(!Number.isInteger(r.boat)||r.boat<1||r.boat>6||official.has(r.boat)||
   !/^\d{4,6}$/.test(String(r.racerId??'')))
   return {status:'held',reason:'invalid_official_racer_identity',eligibleForCalibration:false};
  official.set(r.boat,String(r.racerId));
 }
 const seen=new Set(),rows=[];
 for(const r of parsed.racers){
  if(!Number.isInteger(r.boat)||r.boat<1||r.boat>6||seen.has(r.boat)||
   official.get(r.boat)!==String(r.racerId))
   return {status:'held',reason:'result_racer_identity_mismatch',eligibleForCalibration:false};
  seen.add(r.boat);
  rows.push({boat:r.boat,racerId:String(r.racerId),finish:r.finish??null,
   resultStatus:r.resultStatus??null,actualEntryCourse:r.actualEntryCourse??null});
 }
 if(seen.size!==6)return {status:'held',reason:'result_boat_set_incomplete',eligibleForCalibration:false};
 return {status:'official_racelist_result_identity_matched',date:snapshot.date,venue:snapshot.venue,
  race:snapshot.race,rows:rows.sort((a,b)=>a.boat-b.boat),
  independentResultVerification:false,preRaceIndependentlyVerified:false,eligibleForCalibration:false,
  note:'Six racer IDs and boats agree across two official page parses. Result remains pending independent review; do not treat as verified prediction accuracy.'};
}
