#!/usr/bin/env node
// Offline, bounded review of saved cutoff evidence. No network or calibration.
import fs from 'node:fs';
import {compareCutoffDiagnostics} from './compare-cutoff-diagnostics.mjs';
const path='prediction-captures/official-cutoff-source-evidence.json';
if(!fs.existsSync(path))throw Error('saved_cutoff_evidence_missing');
const input=JSON.parse(fs.readFileSync(path,'utf8'));
if(!Array.isArray(input.records))throw Error('invalid_saved_cutoff_evidence');
const report=compareCutoffDiagnostics(input.records);
console.log(JSON.stringify({source:path,total:report.total,unverifiedRaceScoped:report.unverifiedRaceScoped,verifiedCutoffs:report.verifiedCutoffs,eligibleForCalibration:report.eligibleForCalibration,examples:report.rows.filter(x=>x.diagnosticCutoffJst).slice(0,15)},null,2));
