#!/usr/bin/env node
// Run the read-only six-boat completeness audit against a saved prediction capture.
// No network calls, no scoring changes, no pre-race authenticity claims.
import fs from 'node:fs';
import {auditCaptureRacerFields} from './audit-capture-racer-fields.mjs';
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/report-capture-racer-fields.mjs prediction-captures/YYYYMMDD-RUNID.json');
const capture=JSON.parse(fs.readFileSync(path,'utf8'));
const report=auditCaptureRacerFields(capture);
console.log(JSON.stringify({file:path,date:capture.date,...report},null,2));
