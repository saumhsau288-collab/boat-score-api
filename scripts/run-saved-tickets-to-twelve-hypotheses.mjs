#!/usr/bin/env node
// Offline only. Inputs require independent verification; never reconstruct predictions from outcomes.
import fs from 'node:fs';
import {compareSavedTicketsToTwelveHypotheses} from './compare-saved-tickets-to-twelve-hypotheses.mjs';
const paths=process.argv.slice(2);
if(paths.length!==3){console.error('Usage: node scripts/run-saved-tickets-to-twelve-hypotheses.mjs capture.json official-results.json verified-spatial-snapshots.json');process.exit(2);}
const [capture,official,snapshots]=paths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
if(!Array.isArray(official?.results)||!Array.isArray(snapshots?.snapshots))throw Error('Expected {results:[]} and {snapshots:[]}');
const report=compareSavedTicketsToTwelveHypotheses(capture,official.results,snapshots.snapshots);
console.log(JSON.stringify(report,null,2));
if(!report.compared)process.exitCode=1;
