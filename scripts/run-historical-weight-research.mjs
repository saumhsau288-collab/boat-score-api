#!/usr/bin/env node
// Offline research only: requires explicitly verified historical feature rows.
import fs from 'node:fs';
import {tuneHistoricalWeights} from './tune-historical-weights-research.mjs';
const [dataPath,configPath]=process.argv.slice(2);
if(!dataPath||!configPath||process.argv.length!==4){
 console.error('Usage: node scripts/run-historical-weight-research.mjs <historical-rows.json> <weights-config.json>');
 process.exit(2);
}
if(dataPath===configPath)throw Error('Historical race rows and configuration must be separate files');
const data=JSON.parse(fs.readFileSync(dataPath,'utf8'));
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
if(!Array.isArray(data.rows))throw Error('Historical input must contain rows[]');
const report=tuneHistoricalWeights(data.rows,config);
console.log(JSON.stringify(report,null,2));
if(report.evaluationChange.exactTop3<0){
 console.error('REGRESSION: Candidate performed worse on held-out races; do not deploy');
 process.exitCode=1;
}
