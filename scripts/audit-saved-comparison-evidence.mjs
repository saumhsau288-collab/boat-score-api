// Offline-only: quantify which independent evidence is missing before claiming hit rates.
export function auditSavedComparisonEvidence(capture,resultsEvidence){
 const rows=Array.isArray(capture?.records)?capture.records:[];
 const official=Array.isArray(resultsEvidence?.results)?resultsEvidence.results:[];
 const map=new Map();
 for(const r of official){
  const k=[r?.date,r?.venue,r?.race].join(':');
  if(!map.has(k))map.set(k,r);else map.set(k,null);
 }
 const report={captureRecords:rows.length,officialResultRecords:official.length,matchedRaceKeys:0,
  verifiedFinishOrders:0,sourceUrlsPresent:0,cutoffsPresent:0,capturedBeforeCutoff:0,
  missing:{officialResult:0,verifiedFinish:0,resultSource:0,cutoff:0,notBeforeCutoff:0},
  warning:'Presence of verified:true and source URL is a claim, not independent authentication. Do not infer cutoff from current or post-race page text.'};
 for(const row of rows){
  const r=map.get([row.date,row.venue,row.race].join(':'));
  if(!r){report.missing.officialResult++;continue;}
  report.matchedRaceKeys++;
  const order=r.finishOrder;
  if(r.verified===true&&Array.isArray(order)&&order.length===6&&new Set(order).size===6&&order.every(n=>Number.isInteger(n)&&n>=1&&n<=6))report.verifiedFinishOrders++;
  else report.missing.verifiedFinish++;
  if(typeof r.sourceUrl==='string'&&/^https:\/\//.test(r.sourceUrl))report.sourceUrlsPresent++;
  else report.missing.resultSource++;
  const cutoff=Date.parse(r.officialCutoffAt);
  if(!Number.isFinite(cutoff)){report.missing.cutoff++;continue;}
  report.cutoffsPresent++;
  const received=Date.parse(row.receivedAt);
  if(Number.isFinite(received)&&received<cutoff)report.capturedBeforeCutoff++;
  else report.missing.notBeforeCutoff++;
 }
 return report;
}
