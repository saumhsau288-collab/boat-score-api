#!/usr/bin/env node
// Offline paired research comparison. Input files must be independently audited; do not fetch historical predictions.
import fs from 'node:fs';
import {compareSavedTicketsToSpatial} from './compare-saved-tickets-to-spatial.mjs';
const paths=process.argv.slice(2);
if(paths.length!==3){console.error('Usage: node scripts/run-saved-tickets-to-spatial.mjs capture.json official-results.json verified-spatial-snapshots.json');process.exit(2);}
const [capture,official,snapshots]=paths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
if(!Array.isArray(official?.results)||!Array.isArray(snapshots?.snapshots))throw Error('Expected {results:[]} and {snapshots:[]}');
const report=compareSavedTicketsToSpatial(capture,official.results,snapshots.snapshots);
console.log(JSON.stringify(report,null,2));
if(!report.compared)process.exitCode=1;
