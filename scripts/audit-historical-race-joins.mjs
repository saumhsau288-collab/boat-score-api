// Research-only batch audit. Do not silently convert missing evidence to verified.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
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

// Read-only CLI: input must already contain independently verified race evidence.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw Error('Usage: node scripts/audit-historical-race-joins.mjs records.json');
  const records=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const report=auditHistoricalRaceJoins(records);
  console.log(JSON.stringify(report,null,2));
  if (!report.accuracyCalculationPermitted) process.exitCode=2;
}
