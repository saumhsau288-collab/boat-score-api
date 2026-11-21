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
 const matched=rows.filter(x=>x.status==='retrospective_comparison_only').length;
 const statuses=rows.reduce((counts,row)=>(counts[row.status]=(counts[row.status]||0)+1,counts),{});
 return {status:'research_only',rows,attempted:rows.length,matched,held:rows.length-matched,statuses,
  originalInputsVerified:rows.filter(x=>x.originalInputsVerified===true).length,
  independentlyAuthenticatedBeforeRace:rows.filter(x=>x.independentPreRaceAuthentication===true).length,
  eligibleForCalibration:false,scoreChangeApplied:false};
}
