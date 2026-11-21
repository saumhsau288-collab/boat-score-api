#!/usr/bin/env node
// Research-only: join three independently captured evidence files and a saved prediction.
// Usage: node scripts/report-live-feature-readiness.mjs race.json official.json average-st.json makulabo.json prediction.json
import fs from 'node:fs';
import {auditFutureFeatureProvenance} from './audit-future-feature-provenance.mjs';
const args=process.argv.slice(2);
if(args.length!==5){console.error('Usage: node scripts/report-live-feature-readiness.mjs race.json official.json average-st.json makulabo.json prediction.json');process.exitCode=2;}
else {
 const [race,official,st,mk,prediction]=args.map(path=>JSON.parse(fs.readFileSync(path,'utf8')));
 const report=auditFutureFeatureProvenance({race,official,averageST:st.rows??[],makulabo:mk.rows??[],prediction,cutoffAt:prediction.cutoffAt});
 const output={date:race.date,venue:race.venue,race:race.race,status:report.status,
  reason:report.reason??null,officialSnapshotBeforePrediction:report.officialSnapshotBeforePrediction===true,
  averageSTVerified:report.averageSTVerified===true,makulabo50Verified:report.makulabo50Verified===true,
  evidenceFreshnessVerified:report.evidenceFreshnessVerified===true,
  originalInputsVerified:false,eligibleForCalibration:false,scoreChangeApplied:false,
  nextAction:report.status==='source_evidence_ready_original_inputs_unverified'?'prove exact input bundle used by deployed predictor':'capture missing six-racer pre-race evidence'};
 console.log(JSON.stringify(output,null,2));
 if(report.status!=='source_evidence_ready_original_inputs_unverified')process.exitCode=2;
}
