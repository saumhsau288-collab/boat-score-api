// Read-only readiness audit for the inside-course/ST research model.
// Flags and timing alone are not proof of authenticity: source evidence must be checked separately.
const metrics=['racerForm','start','motor','recent50','exhibitionWeather'];
export function auditInsideStartHistoryReadiness(rows){
 if(!Array.isArray(rows))throw Error('Expected historical race rows');
 const report={total:rows.length,readyForManualVerification:0,blocked:0,missing:{},races:[],
  verifiedHistoricalAccuracy:false,approvedForDeployment:false,
  warning:'This audit checks structure and supplied evidence pointers only. Human/source verification and an untouched later-date test set remain mandatory.'};
 const counts=new Map();
 for(const r of rows){const key=[r?.date,r?.venue,r?.race].join(':');counts.set(key,(counts.get(key)||0)+1);}
 for(const r of rows){
  const missing=[],key=[r?.date,r?.venue,r?.race].join(':');
  if(!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12)missing.push('race_identity');
  if(counts.get(key)>1)missing.push('duplicate_race');
  if(!Array.isArray(r?.actual)||r.actual.length!==3||new Set(r.actual).size!==3||r.actual.some(n=>!Number.isInteger(n)||n<1||n>6))missing.push('official_podium');
  if(r?.verifiedOfficialResult!==true||typeof r?.officialResultSourceUrl!=='string'||!r.officialResultSourceUrl.startsWith('https://www.boatrace.jp/'))missing.push('official_result_evidence');
  if(r?.verifiedPreRace!==true||typeof r?.preRaceSourceUrl!=='string'||!r.preRaceSourceUrl.startsWith('https://'))missing.push('pre_race_evidence');
  const start=Date.parse(r?.capturedAt),end=Date.parse(r?.cutoffAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)missing.push('pre_cutoff_timing');
  const boats=r?.boats;
  if(!Array.isArray(boats)||boats.length!==6||new Set(boats.map(b=>b?.boat)).size!==6||
     new Set(boats.map(b=>b?.entryCourse)).size!==6||
     boats.some(b=>!Number.isInteger(b?.boat)||b.boat<1||b.boat>6||!Number.isInteger(b?.entryCourse)||b.entryCourse<1||b.entryCourse>6))
    missing.push('six_boats_and_actual_entry');
  if(!Array.isArray(boats)||boats.some(b=>metrics.some(k=>typeof b?.[k]!=='number'||!Number.isFinite(b[k])||b[k]<0||b[k]>1)))missing.push('normalized_pre_race_metrics');
  if(r?.startMetricSource!=='pre_race_average_or_exhibition')missing.push('st_provenance');
  for(const m of missing)report.missing[m]=(report.missing[m]||0)+1;
  if(missing.length)report.blocked++;else report.readyForManualVerification++;
  report.races.push({date:r?.date??null,venue:r?.venue??null,race:r?.race??null,readyForManualVerification:missing.length===0,missing});
 }
 return report;
}
