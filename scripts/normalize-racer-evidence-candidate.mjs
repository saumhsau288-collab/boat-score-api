// Research-only candidate normalization. Never treat this as calibrated.
export function normalizeRacerEvidenceCandidate(snapshot){
 const fail=reason=>({ready:false,reason,eligibleForDeployment:false});
 if(snapshot?.ready!==true||!Array.isArray(snapshot.racers)||snapshot.racers.length!==6)return fail('six_verified_racers_required');
 if(new Set(snapshot.racers.map(r=>r?.boat)).size!==6||!snapshot.racers.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&/^\d{4}$/.test(String(r?.racerId??''))))return fail('invalid_racer_identities');
 const rows=[];
 for(const r of snapshot.racers){
  const v=r?.values??{};
  if(![v.nationalWinRate,v.localWinRate,v.averageST,v.motorSecondPlaceRate,v.expectedEntryCourse,v.exhibitionTime].every(x=>typeof x==='number'&&Number.isFinite(x)))return fail('missing_pre_race_measurements');
  if(v.nationalWinRate<0||v.nationalWinRate>10||v.localWinRate<0||v.localWinRate>10||
    v.averageST<0||v.averageST>1||v.motorSecondPlaceRate<0||v.motorSecondPlaceRate>100||
    !Number.isInteger(v.expectedEntryCourse)||v.expectedEntryCourse<1||v.expectedEntryCourse>6||
    v.exhibitionTime<=0||v.exhibitionTime>30)return fail('out_of_range_measurements');
  const winAverage=(v.nationalWinRate+v.localWinRate)/2;
  // Candidate scales only: ST <= .10 best, >= .25 worst; course monotonic.
  const clamp=x=>Math.max(0,Math.min(1,x));
  rows.push({boat:r.boat,racerId:r.racerId,preRaceVerified:true,
   racerWinRateAverage:clamp(winAverage/10),
   preRaceStartAbility:clamp((0.25-v.averageST)/0.15),
   expectedEntryCourse:(6-v.expectedEntryCourse)/5,
   motorPerformance:v.motorSecondPlaceRate/100,
   // Exhibition timing alone cannot establish a weather-adjusted factor.
   verifiedExhibitionAndWeather:null});
 }
 return {ready:false,reason:'verified_weather_adjusted_exhibition_factor_required',partialRows:rows,
  researchOnly:true,eligibleForDeployment:false,
  note:'Provisional normalization only; race-level exhibition/weather factor and historical calibration are still required.'};
}
