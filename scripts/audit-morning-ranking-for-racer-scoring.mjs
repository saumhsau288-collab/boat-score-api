// Audit the real shape of the morning KV's legacy ranking records.
// A two-factor ranking is not a five-factor 100-point racer assessment.
export function auditMorningRankingForRacerScoring(record){
 const missing=[];
 if(record?.ready!==true||record?.officialVerified!==true||record?.statsVerified!==true)missing.push('verified_official_morning_stats');
 const scores=record?.rankedScores;
 if(!Array.isArray(scores)||scores.length!==6||new Set(scores.map(r=>r?.boat)).size!==6||
    !scores.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&Number.isFinite(r.score)))missing.push('six_valid_ranking_scores');
 const factorNames=['racerWinRateAverage','preRaceStartAbility','expectedEntryCourse','motorPerformance','verifiedExhibitionAndWeather'];
 if(!Array.isArray(record?.racers)||record.racers.length!==6||
   new Set(record.racers.map(r=>r?.boat)).size!==6||
   !record.racers.every(r=>/^\d{4}$/.test(String(r?.racerId??''))))missing.push('six_verified_racer_identities');
 if(!Array.isArray(record?.racers)||record.racers.length!==6||
   !record.racers.every(r=>r?.preRaceVerified===true&&factorNames.every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=1)))missing.push('five_verified_normalized_factors');
 if(!record?.capturedAt||!record?.cutoffAt)missing.push('per_race_capture_and_cutoff_timestamps');
 return {legacyRankingReusable:!missing.includes('verified_official_morning_stats')&&!missing.includes('six_valid_ranking_scores'),
  fiveFactorScoringReady:missing.length===0,missing,method:record?.method??null,
  note:'Morning two-factor ranks may be reviewed descriptively, but are not interchangeable with five-factor 100-point scores.'};
}
