// Research-only distinction between an 08:00 JST pre-race ranking and a
// near-cutoff 12-method draft. Missing exhibition data must not be fabricated.
export function assessPredictionPhase(snapshot,{phase}={}){
 if(!['morning','precutoff'].includes(phase))return {eligible:false,reason:'invalid_phase'};
 if(snapshot?.ready!==true || !Array.isArray(snapshot.racers)||snapshot.racers.length!==6)
  return {eligible:false,phase,reason:'incomplete_racer_snapshot'};
 const base=['nationalWinRate','localWinRate','averageST','motorSecondPlaceRate','last50Score'];
 const required=phase==='precutoff'?[...base,'expectedEntryCourse','exhibitionTime']:base;
 const missing=[];
 for(const racer of snapshot.racers){
  for(const field of required){
   if(typeof racer?.values?.[field]!=='number'||!Number.isFinite(racer.values[field]))
    missing.push({boat:racer?.boat,field});
  }
 }
 if(missing.length)return {eligible:false,phase,reason:'missing_required_phase_features',missing};
 if(phase==='morning')return {eligible:true,phase,methodCount:0,
  eligibleForTwelveMethodAccuracy:false,
  note:'Morning baseline inputs are present. This is not a sealed 12-method prediction or an authenticated capture.'};
 const courses=snapshot.racers.map(r=>r.values.expectedEntryCourse);
 if(courses.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(courses).size!==6)
  return {eligible:false,phase,reason:'invalid_entry_courses'};
 return {eligible:true,phase,methodCount:12,eligibleForTwelveMethodAccuracy:false,
  note:'Feature completeness only; timing and official provenance remain unverified.'};
}
