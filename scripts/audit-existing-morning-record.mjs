// Research-only adapter guard for the existing morning KV rows.
// Existing rows contain rankedScores but no racer IDs, six trifecta picks,
// verified cutoff timestamp, or trustworthy per-race capture time.
export function auditExistingMorningRecord(row){
 const missing=[];
 if(row?.ready!==true||row?.officialVerified!==true||row?.statsVerified!==true)missing.push('verified_morning_ranking');
 if(!Array.isArray(row?.rankedScores)||row.rankedScores.length!==6)missing.push('six_ranked_scores');
 if(!Array.isArray(row?.racers)||row.racers.length!==6||row.racers.some(r=>!/^\d{4}$/.test(String(r?.racerId??''))))missing.push('six_racer_ids');
 if(!Array.isArray(row?.prediction?.mainSix)||row.prediction.mainSix.length!==6)missing.push('six_main_tickets');
 if(!row?.capturedAt)missing.push('per_race_capture_timestamp');
 if(!row?.cutoffAt)missing.push('verified_cutoff_timestamp');
 return {eligibleForStrictBacktest:false,missing,canReuseAsHistoricalRanking:missing.length===0||row?.ready===true};
}
