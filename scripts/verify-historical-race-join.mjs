// Research-only join gate. Never infer identity or cutoff verification from HTML text.
import {selectCutoffFromRaceSchedule} from './select-cutoff-from-race-schedule.mjs';
import {verifyRaceSpecificCutoff} from './verify-race-specific-cutoff.mjs';

export function verifyHistoricalRaceJoin({expected, source, schedule, scoreInputsByBoat, finishByBoat} = {}) {
  const fail = (reason) => ({eligible:false, reason, cutoffEpochMs:null});
  const official = verifyRaceSpecificCutoff({expected, source});
  if (!official.verified) return fail('official_cutoff_unverified:' + official.reasons.join(','));
  const selected = selectCutoffFromRaceSchedule({
    expectedRace: expected.race,
    raceNumbers: schedule?.raceNumbers,
    cutoffTimes: schedule?.cutoffTimes,
    sourceVerified: schedule?.sourceVerified === true
  });
  if (!selected.verified) return fail('schedule_' + selected.reason);
  if (selected.cutoffJst !== source.cutoffJst) return fail('schedule_cutoff_mismatch');
  const receivedAt = Date.parse(source.receivedAt);
  if (!Number.isFinite(receivedAt) || receivedAt !== source.sourceCapturedAtEpochMs) return fail('capture_timestamp_unverified');
  if (receivedAt >= official.cutoffEpochMs) return fail('capture_not_before_cutoff');
  if (!Array.isArray(scoreInputsByBoat) || scoreInputsByBoat.length !== 6 ||
      scoreInputsByBoat.some((v,i) => !v || v.boat !== i+1 || v.verified !== true ||
        typeof v.score !== 'number' || !Number.isFinite(v.score) ||
        !/^\d{4}$/.test(String(v.racerId ?? ''))) ||
      new Set(scoreInputsByBoat.map(v=>String(v.racerId))).size !== 6)
    return fail('six_boat_inputs_unverified');
  if (scoreInputsByBoat.some(v => v.preRaceSourceVerified !== true ||
      typeof v.capturedAt !== 'string' || !Number.isFinite(Date.parse(v.capturedAt)) ||
      Date.parse(v.capturedAt) >= official.cutoffEpochMs))
    return fail('score_inputs_not_verified_before_cutoff');
  if (!Array.isArray(finishByBoat) || finishByBoat.length !== 6 ||
      finishByBoat.some((v,i) => !v || v.boat !== i+1 || !Number.isInteger(v.finish) || v.finish < 1 || v.finish > 6) ||
      new Set(finishByBoat.map(v=>v.finish)).size !== 6)
    return fail('six_boat_finish_unverified');
  if (source.resultVerified !== true) return fail('official_result_unverified');
  return {eligible:true, reason:null, cutoffEpochMs:official.cutoffEpochMs};
}
