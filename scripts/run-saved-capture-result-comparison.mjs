#!/usr/bin/env node
// Offline-only. Inputs must be independent saved capture and official results evidence.
import fs from 'node:fs';
import {compareSavedCaptureWithVerifiedResults} from './compare-saved-capture-results.mjs';
const [capturePath,resultsPath]=process.argv.slice(2);
if(!capturePath||!resultsPath||process.argv.length!==4){
 console.error('Usage: node scripts/run-saved-capture-result-comparison.mjs <saved-capture.json> <verified-official-results.json>');
 process.exit(2);
}
if(capturePath===resultsPath)throw Error('Prediction and result evidence must be separate files');
const capture=JSON.parse(fs.readFileSync(capturePath,'utf8'));
const evidence=JSON.parse(fs.readFileSync(resultsPath,'utf8'));
if(!Array.isArray(capture.records))throw Error('Invalid saved capture: records[] required');
if(!Array.isArray(evidence.results))throw Error('Invalid official results evidence: results[] required');
const report=compareSavedCaptureWithVerifiedResults(capture,evidence.results);
console.log(JSON.stringify(report,null,2));
if(report.compared===0){
 console.error('NO_VERIFIED_COMPARISONS: 0 eligible races; no accuracy rate is claimed.');
 process.exitCode=1;
}
