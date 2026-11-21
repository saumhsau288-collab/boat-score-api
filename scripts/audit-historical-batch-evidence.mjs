// Research-only: validate evidence BEFORE scoring a historical race.
// Never infer pre-race availability from a retrospectively viewed race card.
export function auditHistoricalBatch(records) {
  if (!Array.isArray(records)) return {status:'invalid_batch',eligible:[],held:[]};
  const eligible=[],held=[];
  const counts=new Map();
  for (const record of records) {
    const key=record?.raceKey;
    if (typeof key==='string') counts.set(key,(counts.get(key)??0)+1);
  }
  for (const record of records) {
    const key=record?.raceKey;
    const reasons=[];
    if (typeof key!=='string'||!/^[0-9]{8}-(0[1-9]|1[0-9]|2[0-4])-(?:[1-9]|1[0-2])$/.test(key)) reasons.push('invalid_race_key');
    if (typeof key==='string' && counts.get(key)>1) reasons.push('duplicate_race_key');
    if (record?.prediction?.capturedBeforeDeadline!==true || !Number.isFinite(record?.prediction?.capturedAtEpochMs) || !Number.isFinite(record?.deadlineEpochMs) || record.prediction.capturedAtEpochMs>=record.deadlineEpochMs) reasons.push('prediction_timing_unverified');
    if (record?.prediction?.sourceVerified!==true || !Array.isArray(record?.prediction?.tickets) || !record.prediction.tickets.length) reasons.push('original_prediction_missing');
    const racers=record?.racers;
    if (!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r?.boat)).size!==6||new Set(racers.map(r=>r?.racerId)).size!==6||racers.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||!/^\d{4}$/.test(String(r?.racerId))||r?.officialMetricsVerified!==true||r?.metricsCapturedBeforeDeadline!==true)) reasons.push('six_verified_pre_race_racers_missing');
    if (record?.officialResult?.sourceVerified!==true || !Array.isArray(record?.officialResult?.finishOrder)||record.officialResult.finishOrder.length!==6||new Set(record.officialResult.finishOrder).size!==6||record.officialResult.finishOrder.some(x=>!Number.isInteger(x)||x<1||x>6)) reasons.push('verified_official_result_missing');
    if (record?.officialResult?.raceKey!==key) reasons.push('result_race_mismatch');
    if (reasons.length) held.push({raceKey:key??null,reasons});
    else eligible.push({raceKey:key});
  }
  return {status:'audited',total:records.length,eligibleCount:eligible.length,heldCount:held.length,eligible,held,scoreChangeApplied:false};
}
