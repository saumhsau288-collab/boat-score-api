#!/usr/bin/env node
// Conservative timing audit. The cutoff must be independently verified; raw API metadata alone is not proof.
import fs from 'node:fs';
export function classifyCaptureTiming(record, officialCutoff) {
  const received=Date.parse(record?.receivedAt);
  if(!Number.isFinite(received))return {status:'invalid_capture_time'};
  if(!officialCutoff || officialCutoff.verified!==true || officialCutoff.source!=='official' ||
     !Number.isFinite(Date.parse(officialCutoff.cutoffAt)))
    return {status:'official_cutoff_unverified'};
  if(officialCutoff.date!==record.date || officialCutoff.venue!==record.venue || officialCutoff.race!==record.race)
    return {status:'official_cutoff_identity_mismatch'};
  return {status:received<Date.parse(officialCutoff.cutoffAt)?'captured_before_official_cutoff':'captured_at_or_after_official_cutoff',
    authenticatedBeforeRace:false};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 const [capturePath,cutoffPath]=process.argv.slice(2);
 if(!capturePath)throw Error('Usage: node scripts/audit-morning-official-cutoffs.mjs <capture.json> [verified-cutoffs.json]');
 const capture=JSON.parse(fs.readFileSync(capturePath,'utf8'));
 const cutoffs=cutoffPath?JSON.parse(fs.readFileSync(cutoffPath,'utf8')):[];
 if(!Array.isArray(cutoffs))throw Error('Official cutoffs must be a list');
 const key=r=>[r.date,r.venue,r.race].join(':');
 const byKey=new Map();
 for(const c of cutoffs){if(byKey.has(key(c)))throw Error('Duplicate official cutoff '+key(c));byKey.set(key(c),c);}
 const rows=capture.records.map(r=>({date:r.date,venue:r.venue,race:r.race,...classifyCaptureTiming(r,byKey.get(key(r)))}));
 const counts=rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
 console.log(JSON.stringify({date:capture.date,counts,rows,authenticatedBeforeRace:false,
 warning:'Cutoff comparison is timing evidence only. Independent official source and immutable archive provenance must be audited before accuracy calculations.'},null,2));
}
