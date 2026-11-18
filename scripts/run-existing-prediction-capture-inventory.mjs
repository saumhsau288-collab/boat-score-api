#!/usr/bin/env node
// Read-only: inspect saved captures from the deployed predictor.
import fs from 'node:fs';
import path from 'node:path';
import {inventoryExistingPredictionCaptures} from './inventory-existing-prediction-captures.mjs';
const directory=process.argv[2]||'prediction-captures';
if(!fs.existsSync(directory)||!fs.statSync(directory).isDirectory())throw Error('Capture directory not found: '+directory);
const names=fs.readdirSync(directory).filter(n=>/^20\d{6}-\d+\.json$/.test(n)).sort();
const captures=names.map(n=>{
 const c=JSON.parse(fs.readFileSync(path.join(directory,n),'utf8'));
 if(!Array.isArray(c.records))throw Error('Invalid capture records in '+n);
 return c;
});
const report=inventoryExistingPredictionCaptures(captures);
console.log(JSON.stringify({...report,captureFiles:names},null,2));
if(!names.length){console.error('No saved deployed predictor captures found');process.exitCode=2;}
