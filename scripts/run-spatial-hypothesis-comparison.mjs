#!/usr/bin/env node
// Research-only paired comparison; requires externally authenticated pre-race features and official results.
// Never reconstruct historical predictions using post-race features.
import fs from 'node:fs';
import {compareSpatialHypothesis} from './compare-spatial-hypothesis.mjs';
const [inputPath]=process.argv.slice(2);
if(!inputPath||process.argv.length!==3){console.error('Usage: node scripts/run-spatial-hypothesis-comparison.mjs <authenticated-races.json>');process.exit(2);}
const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
if(!Array.isArray(input.races))throw Error('Expected {races:[]}');
const report=compareSpatialHypothesis(input.races);
const pct=n=>report.eligible?Number((100*n/report.eligible).toFixed(2)):null;
console.log(JSON.stringify({...report,hitRatesPercent:{baselineMain:pct(report.baseline.mainHits),baselineUpset:pct(report.baseline.upsetHits),baselineAny:pct(report.baseline.anyHits),spatialMain:pct(report.spatial.mainHits),spatialUpset:pct(report.spatial.upsetHits),spatialAny:pct(report.spatial.anyHits),deltaAnyPercentagePoints:report.eligible?Number((100*(report.spatial.anyHits-report.baseline.anyHits)/report.eligible).toFixed(2)):null}},null,2));
if(report.eligible===0)process.exitCode=1;
