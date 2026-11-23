// Research-only: detect diagnostic gaps without inventing missing player data.
export function auditVerificationDiagnosticGaps(archives){
 const byDay={};const byRetry={};let examined=0,unverified=0,emptyMissingInputs=0,unverifiedWithEmptyInputs=0;
 for(const archive of archives){
  const day=String(archive?.date??'unknown');
  const dayCount=byDay[day]??={examined:0,unverifiedWithEmptyInputs:0};
  for(const r of Array.isArray(archive?.records)?archive.records:[]){
   if(r?.httpStatus!==200||r?.response?.ready!==false)continue;
   examined++;dayCount.examined++;
   const p=r.response;
   const failed=p.officialVerified===false||p.statsVerified===false;
   const empty=Array.isArray(p.missingInputs)&&p.missingInputs.length===0;
   if(failed)unverified++;
   if(empty)emptyMissingInputs++;
   if(failed&&empty){
    unverifiedWithEmptyInputs++;dayCount.unverifiedWithEmptyInputs++;
    const reason=typeof p.officialStatsRetry==='string'?p.officialStatsRetry:'unknown';
    byRetry[reason]=(byRetry[reason]??0)+1;
   }
  }
 }
 return {examined,unverified,emptyMissingInputs,unverifiedWithEmptyInputs,byDay,byRetry,
  recommendedInstrumentation:'At the point official verification fails, record a bounded diagnostic stage and a reason code (not fabricated player inputs); keep missingInputs empty unless missing fields are actually known.',
  warning:'An empty missingInputs array is not evidence that required inputs are present. This is a diagnostic observability gap, not a measured upstream failure.'};
}
