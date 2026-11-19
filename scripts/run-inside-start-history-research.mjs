#!/usr/bin/env node
// Offline JSON runner. This never fetches live results or changes deployed scoring.
// Usage: node scripts/run-inside-start-history-research.mjs path/to/verified-rows.json
import fs from 'node:fs';
import {auditInsideStartHistoryReadiness} from './audit-inside-start-history-readiness.mjs';
import {compareInsideStartTickets} from './compare-inside-start-ticket-history.mjs';
const BASELINE_PROXY=Object.freeze({racerForm:20,start:10,entryCourse:50,motor:10,recent50:5,exhibitionWeather:5});
export function runInsideStartHistoryResearch(rows){
 const readiness=auditInsideStartHistoryReadiness(rows);
 // All evidence fields are still subject to independent human verification.
 const keys=new Set(readiness.races.filter(r=>r.readyForManualVerification).map(r=>[r.date,r.venue,r.race].join(':')));
 const eligible=rows.filter(r=>keys.has([r?.date,r?.venue,r?.race].join(':')));
 const comparison=compareInsideStartTickets(eligible,{baselineWeights:BASELINE_PROXY});
 return {readiness,comparison,baselineDescription:'Explicit illustrative same-feature proxy; NOT the deployed Boat Score 2 weights',
  eligibleForProductionChange:false,verifiedAccuracy:false,
  warning:'No historical accuracy is independently established by this report. Authenticate source captures, then evaluate on later untouched dates.'};
}
if(process.argv[1]?.endsWith('/run-inside-start-history-research.mjs')){
 const filename=process.argv[2];if(!filename)throw Error('Provide path to saved historical JSON rows[]');
 const raw=JSON.parse(fs.readFileSync(filename,'utf8'));
 console.log(JSON.stringify(runInsideStartHistoryResearch(Array.isArray(raw)?raw:raw.records),null,2));
}
