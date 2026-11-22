#!/usr/bin/env node
// Offline-only: no network fetch, no historical API replay, no fabricated rates.
import fs from 'node:fs';
import {evaluateEligibleSavedTicketSlots} from './evaluate-eligible-saved-ticket-slots.mjs';
const [capturePath,resultsPath]=process.argv.slice(2);
if(process.argv.length!==4||!capturePath||!resultsPath){
 console.error('Usage: node scripts/run-eligible-saved-ticket-slots.mjs <saved-capture.json> <independent-official-results.json>');
 process.exit(2);
}
if(capturePath===resultsPath)throw Error('Saved prediction and official results must be separate evidence files');
const capture=JSON.parse(fs.readFileSync(capturePath,'utf8'));
const results=JSON.parse(fs.readFileSync(resultsPath,'utf8'));
if(!Array.isArray(capture.records)||!Array.isArray(results.results))throw Error('Expected capture.records[] and results.results[]');
const report=evaluateEligibleSavedTicketSlots(capture,results.results);
console.log(JSON.stringify(report,null,2));
if(report.compared===0){
 console.error('NO_VERIFIED_COMPARISONS: no eligible races; slot rates remain null.');
 process.exitCode=1;
}
