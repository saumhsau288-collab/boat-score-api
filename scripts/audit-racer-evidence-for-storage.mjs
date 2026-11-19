// Structural validation only; this cannot prove a source or timestamp is authentic.
export function auditRacerEvidenceForStorage(snapshot){
 const issues=[];
 if(snapshot?.ready!==true||snapshot?.schemaVersion!==1)issues.push('invalid_snapshot_schema');
 const zone=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
 const captured=snapshot?.capturedAt,cutoff=snapshot?.cutoffAt;
 if(!zone.test(captured??'')||!zone.test(cutoff??'')||!Number.isFinite(Date.parse(captured))||!Number.isFinite(Date.parse(cutoff))||Date.parse(captured)>=Date.parse(cutoff))issues.push('invalid_precutoff_timestamps');
 else{
  const jst=t=>new Date(Date.parse(t)+32400000).toISOString().slice(0,10).replace(/-/g,'');
  if(jst(captured)!==String(snapshot.date)||jst(cutoff)!==String(snapshot.date))issues.push('jst_date_mismatch');
 }
 if(snapshot?.source!=='official_live_entry')issues.push('unverified_source');
 if(snapshot?.captureStatus!=='server_timestamped_verified')issues.push('trusted_server_capture_required');
 const rows=snapshot?.racers;
 if(!Array.isArray(rows)||rows.length!==6||new Set(rows.map(r=>r?.boat)).size!==6||new Set(rows.map(r=>r?.racerId)).size!==6||
  !rows.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&/^\d{4}$/.test(String(r?.racerId??''))))issues.push('invalid_six_racer_identities');
 const bounds={nationalWinRate:[0,10],localWinRate:[0,10],averageST:[0,1],motorSecondPlaceRate:[0,100],expectedEntryCourse:[1,6],exhibitionTime:[0,30],last50Score:[0,100]};
 const missing={};
 if(Array.isArray(rows))for(const r of rows){
  const values=r?.values??{};
  for(const [field,[min,max]] of Object.entries(bounds)){
   const v=values[field];
   if(v===null||v===undefined){missing[field]=(missing[field]||0)+1;continue;}
   if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(field==='expectedEntryCourse'&&!Number.isInteger(v)))issues.push('invalid_'+field);
  }
 }
 return {structurallyValid:issues.length===0,complete:Object.keys(missing).length===0,issues:[...new Set(issues)],missing,
  storageEligible:issues.length===0&&Object.keys(missing).length===0,
  note:'Labels and timestamps alone do not prove trusted capture; the server ingestion boundary must verify them.'};
}
