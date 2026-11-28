#!/usr/bin/env node
// Read-only adapter: audit legacy morning-capture JSON without inventing missing features.
// Usage: node scripts/audit-morning-capture-evidence.mjs capture.json
import fs from 'node:fs';
import {evaluateEvidenceBatch} from './validate-independent-prerace-evidence.mjs';
export function auditMorningCapture(capture) {
 if(!capture || !Array.isArray(capture.records)) throw Error('Expected morning capture with records array');
 const records=capture.records.map(row=>{
   // Legacy server responses are not independently authenticated feature snapshots.
   // Preserve only explicit fields; never infer missing values or assert provenance.
   const payload=row?.response;
   return {
     date:row?.date,venue:row?.venue,race:row?.race,
     capturedAt:row?.receivedAt,
     officialCutoffAt:payload?.officialCutoffAt,
     cutoffSourceVerified:false,captureSourceVerified:false,
     modelVersion:payload?.version || payload?.method || '',
     featureSource:payload?.featureSource || '',
     racers:Array.isArray(payload?.scoreInputsByBoat)?payload.scoreInputsByBoat:undefined
   };
 });
 const evaluation=evaluateEvidenceBatch(records);
 const reasons={};
 for(const row of evaluation.held)for(const reason of row.errors)reasons[reason]=(reasons[reason]||0)+1;
 return {source:'legacy_morning_capture_read_only',total:evaluation.total,
   eligibleCount:evaluation.eligibleCount,heldCount:evaluation.heldCount,
   heldReasons:reasons,
   note:'Legacy responses cannot establish independently verified pre-cutoff inputs. No historical accuracy calculation.'};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
 if(process.argv.length!==3)throw Error('Usage: node scripts/audit-morning-capture-evidence.mjs capture.json');
 console.log(JSON.stringify(auditMorningCapture(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
}
