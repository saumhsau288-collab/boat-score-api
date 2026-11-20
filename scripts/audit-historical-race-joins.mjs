// Research-only batch audit. Do not silently convert missing evidence to verified.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
export function auditHistoricalRaceJoins(records) {
  if (!Array.isArray(records)) throw new TypeError('records_must_be_array');
  const reasons={};
  let eligible=0;
  for (const record of records) {
    const result=verifyHistoricalRaceJoin(record);
    if (result.eligible) eligible++;
    else reasons[result.reason]=(reasons[result.reason]??0)+1;
  }
  return {total:records.length,eligible,excluded:records.length-eligible,reasons,accuracyCalculationPermitted:eligible>0};
}
