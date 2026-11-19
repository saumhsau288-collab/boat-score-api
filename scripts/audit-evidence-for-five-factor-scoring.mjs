// Research-only bridge: validate readiness without inventing normalization rules.
// Raw win rates, average ST, and motor percentages must not be scored directly.
export function auditEvidenceForFiveFactorScoring(snapshot){
 const missing=[];
 if(snapshot?.ready!==true||!Array.isArray(snapshot?.racers)||snapshot.racers.length!==6)missing.push('valid_six_racer_evidence');
 const rows=snapshot?.racers??[];
 if(rows.length===6){
  if(new Set(rows.map(r=>r.boat)).size!==6||!rows.every(r=>Number.isInteger(r.boat)&&r.boat>=1&&r.boat<=6))missing.push('unique_boat_numbers');
  if(!rows.every(r=>/^\d{4}$/.test(String(r.racerId??''))))missing.push('verified_racer_identities');
  for(const [field,key] of [['nationalWinRate','nationwide_win_rate'],['averageST','pre_race_average_st'],['motorSecondPlaceRate','motor_second_place_rate']]){
   if(!rows.every(r=>Number.isFinite(r?.values?.[field])))missing.push(key);
  }
 }
 // These are not supplied by the morning official-entry adapter.
 if(!rows.length||!rows.every(r=>Number.isFinite(r?.values?.expectedEntryCourse)))missing.push('verified_entry_course');
 if(!rows.length||!rows.every(r=>Number.isFinite(r?.values?.exhibitionTime)))missing.push('verified_exhibition');
 if(!rows.length||!rows.every(r=>r?.factorNormalizationVerified===true))missing.push('verified_normalization_rules');
 return {readyForFiveFactorScoring:missing.length===0,missing,eligibleForDeployment:false,
  warning:'This audit never converts raw measurements into normalized scores. Verified pre-cutoff factor definitions and trusted server capture provenance remain mandatory.'};
}
