#!/usr/bin/env node
// Offline research audit: compare archived official result HTML to six saved
// racer IDs. Never elevates structural matching into authenticated results.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {inspectResearchResultJoin} from './inspect-research-result-join.mjs';
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
export function auditArchivedResultJoin(metadata,html,prediction){
 const expected=prediction?.expected;
 const scoreInputsByBoat=prediction?.scoreInputsByBoat;
 const joined=inspectResearchResultJoin({metadata,html,expected,scoreInputsByBoat});
 if(joined.status!=='structural_match_only')return joined;
 const sourceReceived=Date.parse(prediction?.source?.receivedAt??'');
 const scoreTimes=scoreInputsByBoat.map(r=>Date.parse(r.scoreComputedAt??''));
 const timestampSequenceValid=Number.isFinite(sourceReceived)&&scoreTimes.every(t=>Number.isFinite(t)&&t>=sourceReceived);
 // Full eligibility requires a separate independently authenticated finish record.
 // Do not manufacture officialResultVerified=true from a parsed HTML table.
 const historicalGate=verifyHistoricalRaceJoin(prediction);
 return {...joined,predictionTimestampStructureValid:timestampSequenceValid,
  historicalGateEligible:historicalGate.eligible,historicalGateReason:historicalGate.reason,
  cutoffDeclared:typeof prediction?.source?.cutoffJst==='string'?prediction.source.cutoffJst:null,
  eligibleForWeightTuning:false,officialResultVerified:false,
  reason:'structural_join_only_requires_independent_cutoff_and_result_authentication'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [receiptFile,htmlFile,predictionFile,outputFile]=process.argv.slice(2);
 if(!receiptFile||!htmlFile||!predictionFile)throw Error('Usage: node scripts/audit-archived-result-join.mjs receipt.json result.html saved-prediction.json [report.json]');
 const result=auditArchivedResultJoin(JSON.parse(fs.readFileSync(receiptFile,'utf8')),
  fs.readFileSync(htmlFile,'utf8'),JSON.parse(fs.readFileSync(predictionFile,'utf8')));
 const output=JSON.stringify(result,null,2)+'\n';
 if(outputFile)fs.writeFileSync(outputFile,output);
 console.log(output);
 if(result.status!=='structural_match_only')process.exitCode=2;
}
