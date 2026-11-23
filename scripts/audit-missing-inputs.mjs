// Research-only: count missing input identifiers without treating them as proven upstream faults.
export function auditMissingInputs(archives){
 const counts={};const byRetry={};let records=0,missingArray=0,emptyArray=0,nonStringEntries=0;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  if(r?.httpStatus!==200||r?.response?.ready!==false)continue;
  records++;
  const inputs=r.response.missingInputs;
  if(!Array.isArray(inputs)){missingArray++;continue;}
  if(!inputs.length)emptyArray++;
  const retry=typeof r.response.officialStatsRetry==='string'?r.response.officialStatsRetry:'unknown';
  const bucket=byRetry[retry]??={records:0,inputs:{}};
  bucket.records++;
  for(const item of new Set(inputs)){
   if(typeof item!=='string'||!item.trim()){nonStringEntries++;continue;}
   const name=item.trim().slice(0,100);
   counts[name]=(counts[name]??0)+1;
   bucket.inputs[name]=(bucket.inputs[name]??0)+1;
  }
 }
 return {records,missingArray,emptyArray,nonStringEntries,counts,byRetry,warning:'Missing input labels are application-reported; they do not independently establish upstream failure, active venues or recoverable races.'};
}
