#!/usr/bin/env node
// Offline readiness audit for pairing original deployed 12 tickets with spatial research predictions.
// Never silently convert a raw capture to independently authenticated pre-race evidence.
import fs from 'node:fs';
import {auditPreRaceFeatureSnapshots} from './audit-pre-race-feature-snapshots.mjs';
export function auditPairedComparisonReadiness(capture){
 if(!Array.isArray(capture?.records))throw Error('records_required');
 const features=auditPreRaceFeatureSnapshots(capture);
 const reasons={};const add=r=>reasons[r]=(reasons[r]||0)+1;
 for(let i=0;i<capture.records.length;i++){
  const r=capture.records[i],a=features.rows[i];
  if(r?.response?.ready!==true||r?.httpStatus!==200)add('not_ready');
  if(!Array.isArray(r?.response?.main)||r.response.main.length!==6||!Array.isArray(r?.response?.upset)||r.response.upset.length!==6)add('missing_original_six_plus_six');
  if(!a.completeSixBoatFeatures)add('missing_complete_six_boat_features');
  if(!a.preRaceIndependentlyVerified)add('independent_pre_race_evidence_missing');
  if(!a.cutoffTimestampPresent)add('official_cutoff_evidence_missing');
 }
 return {total:capture.records.length,ready:capture.records.filter(r=>r?.response?.ready===true&&r.httpStatus===200).length,completeSixBoatFeatures:features.completeSixBoatFeatures,independentlyVerifiedPreRace:features.independentlyVerifiedPreRace,authenticatedBeforeRace:capture.authenticatedBeforeRace===true,blockingReasons:reasons,eligibleForPairedComparison:0,warning:'Score input vectors are not automatically spatial model features (score, avgStart); require independently documented mapping and official cutoff evidence. Never infer pre-race provenance from timestamps alone.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==3)throw Error('Usage: node scripts/audit-paired-comparison-readiness.mjs capture.json');
 console.log(JSON.stringify(auditPairedComparisonReadiness(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
}
