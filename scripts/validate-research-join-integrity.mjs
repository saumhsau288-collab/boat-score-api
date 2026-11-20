// Fail-closed validation of research identity joins; no historical accuracy claims.
export function validateResearchJoin({capture,comparison,coverage}){
 if(!Array.isArray(capture?.records)||!Array.isArray(comparison?.races)||!Array.isArray(coverage?.records))throw Error('join_arrays_required');
 const key=r=>[String(r.date),Number(r.venue),Number(r.race)].join(':');
 function unique(rows,label){
  const seen=new Set();
  for(const r of rows){
   if(!/^20\d{6}$/.test(String(r.date))||!Number.isInteger(Number(r.venue))||Number(r.venue)<1||Number(r.venue)>24||!Number.isInteger(Number(r.race))||Number(r.race)<1||Number(r.race)>12)throw Error(label+'_invalid_race_key');
   const k=key(r);
   if(seen.has(k))throw Error(label+'_duplicate_race_key:'+k);
   seen.add(k);
  }
  return seen;
 }
 const ready=capture.records.filter(r=>r.response?.ready===true);
 const readyKeys=unique(ready,'capture');
 const comparisonKeys=unique(comparison.races,'comparison');
 const coverageKeys=unique(coverage.records,'coverage');
 for(const r of comparison.races){
  if(!Array.isArray(r.racers)||r.racers.length!==6||new Set(r.racers.map(x=>x.boat)).size!==6||r.racers.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6))throw Error('comparison_six_unique_racers_required:'+key(r));
 }
 for(const k of readyKeys)if(!comparisonKeys.has(k)||!coverageKeys.has(k))throw Error('unmatched_ready_race:'+k);
 return {readyCount:ready.length,comparisonCount:comparison.races.length,coverageCount:coverage.records.length,matchedReadyCount:ready.length,preRaceAuthenticated:false,calibrationEligible:false};
}
