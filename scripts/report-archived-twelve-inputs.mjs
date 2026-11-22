#!/usr/bin/env node
// Read-only report on captured deployed predictor responses; does NOT make
// forecasts or attest provenance. Use with existing raw capture artifact.
import {readFile} from 'node:fs/promises';
import {auditArchivedCaptureForTwelveMethods} from './audit-archived-capture-twelve-methods.mjs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/report-archived-twelve-inputs.mjs <capture.json>');process.exitCode=2;}
else {
 try {
  const capture=JSON.parse(await readFile(path,'utf8'));
  const report=auditArchivedCaptureForTwelveMethods(capture);
  console.log(JSON.stringify({source:path,date:capture.date??null,...report},null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
