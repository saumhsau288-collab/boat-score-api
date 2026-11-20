// Research-only stricter gate for retained raw API responses.
// Never interpret ready:true as independently verified pre-deadline prediction.
export function auditRetainedReadyCoverage(summary) {
 if(!summary||!Array.isArray(summary.days))return {status:'invalid_inventory'};
 const totals={attempted:0,ready:0,uniqueReadyKeys:0,duplicates:0,explicitSixBoatInputs:0,independentlyAuthenticated:0};
 for(const d of summary.days){
  for(const key of ['attempted','ready','uniqueReadyKeys','duplicates','explicitSixBoatInputs','independentlyAuthenticated'])
   if(!Number.isInteger(d[key])||d[key]<0)return {status:'invalid_inventory',reason:key};
  if(d.ready!==d.uniqueReadyKeys+d.duplicates || d.explicitSixBoatInputs>d.ready || d.independentlyAuthenticated>d.ready)
   return {status:'invalid_inventory',reason:'inconsistent_counts'};
  for(const key of Object.keys(totals))totals[key]+=d[key];
 }
 return {status:'coverage_only',...totals,accuracyCalculationPermitted:false,
  reason:'No independently joined official results or authenticated six-racer pre-race feature vectors'};
}
