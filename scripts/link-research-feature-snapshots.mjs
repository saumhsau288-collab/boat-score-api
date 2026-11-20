// Research-only linkage manifest for raw deployed predictions and independent feature snapshots.
// No inferred inputs, reconstructed historical predictions, or automatic calibration.
import {validateFeatureSnapshot} from './validate-research-feature-snapshot.mjs';
const key=(x)=>[String(x?.date??''),String(x?.venue??''),String(x?.race??'')].join(':');
export function linkResearchSnapshots(capture,snapshots=[]){
 if(!Array.isArray(capture?.records)||!Array.isArray(snapshots))throw Error('invalid_input');
 const byKey=new Map();
 for(const snapshot of snapshots){
  const k=key(snapshot);
  if(byKey.has(k))throw Error('duplicate_snapshot:'+k);
  byKey.set(k,snapshot);
 }
 const rows=capture.records.map(record=>{
  const k=key(record),snapshot=byKey.get(k);
  const check=snapshot?validateFeatureSnapshot(snapshot):null;
  const errors=[];
  if(record?.response?.ready!==true)errors.push('deployed_prediction_not_ready');
  if(!snapshot)errors.push('feature_snapshot_missing');
  else errors.push(...check.errors);
  if(!record?.responseSha256||!/^[0-9a-f]{64}$/.test(record.responseSha256))errors.push('prediction_response_hash_missing');
  if(!record?.receivedAt||!snapshot?.capturedAt||!Number.isFinite(Date.parse(record.receivedAt))||!Number.isFinite(Date.parse(snapshot.capturedAt))||Date.parse(snapshot.capturedAt)>Date.parse(record.receivedAt))errors.push('snapshot_not_captured_before_prediction_response');
  errors.push('independent_prediction_timing_and_official_result_review_required');
  return {raceKey:k,predictionResponseSha256:record?.responseSha256??null,hasSnapshot:!!snapshot,featureStructurallyComplete:check?.structurallyComplete??false,calibrationEligible:false,errors:[...new Set(errors)]};
 });
 return {total:rows.length,ready:capture.records.filter(r=>r?.response?.ready===true).length,linked:rows.filter(r=>r.hasSnapshot).length,completeFeatureSnapshots:rows.filter(r=>r.featureStructurallyComplete).length,calibrationEligible:0,rows,warning:'Linkage is only structural. Independent pre-race authenticity, deployed scoring provenance, and official finishing order remain unverified.'};
}
