// Read-only CLI for saved morning API captures; does not fetch, predict or deploy.
// Usage: node scripts/inspect-saved-morning-capture.mjs capture.json
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {auditMorningCaptureForIndependentMethods} from './audit-independent-morning-capture.mjs';
export function inspectSavedMorningCapture(capture){
 const audit=auditMorningCaptureForIndependentMethods(capture);
 const reasons={};
 for(const item of audit.details)for(const reason of item.errors)
  reasons[reason]=(reasons[reason]||0)+1;
 return {captureDate:audit.captureDate,attempted:audit.attempted,
  provisionalComplete:audit.provisionalComplete,
  eligibleForVerifiedAccuracy:audit.eligibleForVerifiedAccuracy,
  held:audit.held,missingSixRacerFeatures:audit.missingSixRacerFeatures,
  reasons,note:audit.note};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts/inspect-saved-morning-capture.mjs capture.json');
 const capture=JSON.parse(fs.readFileSync(file,'utf8'));
 console.log(JSON.stringify(inspectSavedMorningCapture(capture),null,2));
}
