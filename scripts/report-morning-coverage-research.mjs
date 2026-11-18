#!/usr/bin/env node
// Read-only offline report from an existing raw capture artifact.
import fs from 'node:fs';
import {auditMorningCoverage} from './audit-morning-coverage-research.mjs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/report-morning-coverage-research.mjs <raw-capture.json>');process.exit(2);}
const capture=JSON.parse(fs.readFileSync(file,'utf8'));
console.log(JSON.stringify({source:file,...auditMorningCoverage(capture)},null,2));
