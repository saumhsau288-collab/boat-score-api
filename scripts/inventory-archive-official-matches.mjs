// Offline research-only inventory of race identities; not a prediction accuracy test.
const key=r=>/^20\d{6}$/.test(String(r?.date??''))&&Number.isInteger(Number(r?.venue))&&Number.isInteger(Number(r?.race))&&Number(r.venue)>=1&&Number(r.venue)<=24&&Number(r.race)>=1&&Number(r.race)<=12?[String(r.date),Number(r.venue),Number(r.race)].join(':'):null;
export function inventoryArchiveOfficialMatches(archives,officialReports){
 const predictions=new Map(),results=new Map();
 for(const archive of archives){
  for(const r of Array.isArray(archive?.records)?archive.records:[]){
   const k=key(r);if(!k)continue;
   const v=predictions.get(k)??{count:0,ready:0,authenticated:0};
   v.count++;if(r?.response?.ready===true)v.ready++;
   if(archive?.authenticatedBeforeRace===true&&r?.independentlyAuthenticatedCapture===true)v.authenticated++;
   predictions.set(k,v);
  }
 }
 for(const report of officialReports){
  for(const r of Array.isArray(report?.rows)?report.rows:[]){
   const k=key(r);if(!k)continue;
   const v=results.get(k)??{count:0,parsed:0,verified:0};
   v.count++;if(r.status==='parsed_needs_independent_review'&&Array.isArray(r.podium)&&r.podium.length===3)v.parsed++;
   if(r.racerFinishIndependentlyVerified===true)v.verified++;
   results.set(k,v);
  }
 }
 const rows=[...results].map(([raceKey,official])=>({raceKey,prediction:predictions.get(raceKey)??null,official,
  diagnosticMatch:official.count===1&&official.parsed===1&&predictions.get(raceKey)?.count===1&&predictions.get(raceKey)?.ready===1,
  eligibleForAccuracy:false})).sort((a,b)=>a.raceKey.localeCompare(b.raceKey));
 return {officialRaceKeys:results.size,archiveRaceKeys:predictions.size,overlappingRaceKeys:rows.filter(r=>r.prediction).length,
  diagnosticMatches:rows.filter(r=>r.diagnosticMatch).length,overlapReady:rows.filter(r=>r.prediction?.ready===1).length,overlapParsed:rows.filter(r=>r.official.parsed===1).length,overlapNotReady:rows.filter(r=>r.prediction?.ready===0).length,overlapMissingResult:rows.filter(r=>r.official.parsed===0).length,eligibleForAccuracy:0,rows,
  warning:'Race-key joins are descriptive only. Archived captures and parsed results lack independent pre-race/result verification; do not infer hits or update scores.'};
}
