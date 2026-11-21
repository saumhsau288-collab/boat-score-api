// Research-only: join saved predictions to official snapshots without claiming original inputs.
import {auditPredictionInputProvenance} from './audit-prediction-input-provenance.mjs';
export function auditSavedPredictionOfficialProvenance({savedRecords=[],officialRaces=[]}={}){
 const key=x=>[String(x?.date??'').replaceAll('-',''),Number(x?.venue),Number(x?.race)].join('/');
 const counts=new Map(),officialMap=new Map();
 for(const o of officialRaces){const k=key(o);counts.set(k,(counts.get(k)||0)+1);if(!officialMap.has(k))officialMap.set(k,o);}
 const savedCounts=new Map();
 for(const p of savedRecords){const k=key(p);savedCounts.set(k,(savedCounts.get(k)||0)+1);}
 const rows=savedRecords.map(prediction=>{
  const k=key(prediction);
  if(savedCounts.get(k)!==1)return {date:prediction.date,venue:prediction.venue,race:prediction.race,status:'held_duplicate_prediction',eligibleForCalibration:false};
  if(counts.get(k)>1)return {date:prediction.date,venue:prediction.venue,race:prediction.race,status:'held_duplicate_official',eligibleForCalibration:false};
  const official=officialMap.get(k);
  if(!official)return {date:prediction.date,venue:prediction.venue,race:prediction.race,status:'held_missing_official',eligibleForCalibration:false};
  return auditPredictionInputProvenance({prediction,official});
 });
 return {status:'research_only',rows,matched:rows.filter(x=>x.status==='retrospective_comparison_only').length,
  originalInputsVerified:0,eligibleForCalibration:false,scoreChangeApplied:false};
}
