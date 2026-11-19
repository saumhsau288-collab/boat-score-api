import fs from 'node:fs';
const jst=iso=>new Date(iso).toLocaleString('sv-SE',{timeZone:'Asia/Tokyo',hour12:false});
export function auditRealCapture(capture){
 if(!Array.isArray(capture?.records))throw Error('records[] required');
 const ready=capture.records.filter(r=>r.response?.ready===true);
 const times=ready.map(r=>r.receivedAt).filter(t=>Number.isFinite(Date.parse(t))).sort();
 const count=k=>ready.filter(r=>r.response?.[k]===true).length;
 const missing={};for(const r of ready)for(const f of r.response?.missingInputs||[])missing[f]=(missing[f]||0)+1;
 const completeOriginal=ready.filter(r=>Array.isArray(r.response?.scoreInputsByBoat)&&r.response.scoreInputsByBoat.length===6).length;
 return {date:capture.date,attempted:capture.records.length,ready:ready.length,firstReadyJst:times.length?jst(times[0]):null,lastReadyJst:times.length?jst(times.at(-1)):null,
  startAdjusted:count('startAdjustmentApplied'),exhibitionAdjusted:count('exhibitionAdjustmentApplied'),predictionChanged:count('predictionChanged'),
  missingInputs:missing,withSixOriginalInputRows:completeOriginal,authenticatedBeforeRace:capture.authenticatedBeforeRace===true,
  accuracyPermitted:false,weightChangePermitted:false};
}
if(process.argv[1]?.endsWith('/audit-real-capture.mjs')){const file=process.argv[2];if(!file)throw Error('Provide capture JSON');console.log(JSON.stringify(auditRealCapture(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));}
