#!/usr/bin/env node
// Research-only: identify captured original six-boat feature vectors.
// Timestamps alone never establish that a response preceded the official cutoff.
import fs from 'node:fs';
export function auditPreRaceFeatureSnapshots(capture) {
 const fields=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
 if(!Array.isArray(capture?.records))throw Error('records_required');
 const rows=capture.records.map(r=>{
  const boats=r?.response?.scoreInputsByBoat;
  const six=Array.isArray(boats)&&boats.length===6&&
    new Set(boats.map(x=>x?.boat)).size===6&&
    boats.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6);
  const complete=six&&boats.every(x=>fields.every(f=>typeof x[f]==='number'&&Number.isFinite(x[f])));
  const timing=Number.isFinite(Date.parse(r?.receivedAt))&&
    Number.isFinite(Date.parse(r?.officialCutoffAt))&&
    Date.parse(r.receivedAt)<Date.parse(r.officialCutoffAt);
  return {date:r?.date??null,venue:r?.venue??null,race:r?.race??null,
   ready:r?.response?.ready===true,completeSixBoatFeatures:complete,
   cutoffTimestampPresent:Number.isFinite(Date.parse(r?.officialCutoffAt)),
   receivedBeforeClaimedCutoff:timing,
   preRaceIndependentlyVerified:false,
   eligibleForHistoricalCalibration:false};
 });
 return {total:rows.length,completeSixBoatFeatures:rows.filter(r=>r.completeSixBoatFeatures).length,
  independentlyVerifiedPreRace:0,eligibleForHistoricalCalibration:0,rows,
  warning:'Raw API timestamps and cutoff fields are not independent proof. No historical weight tuning authorized.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const path=process.argv[2];if(!path)throw Error('Usage: node scripts/audit-pre-race-feature-snapshots.mjs capture.json');
 console.log(JSON.stringify(auditPreRaceFeatureSnapshots(JSON.parse(fs.readFileSync(path,'utf8'))),null,2));
}
