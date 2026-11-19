// Historical replay input readiness: a saved prediction score is NOT original six-boat input.
// This only audits records; it never predicts, estimates missing features or changes scoring.
import fs from 'node:fs';
const FIELDS=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
const dateOK=s=>{
 if(typeof s!=='string'||!/^20\d{6}$/.test(s))return false;
 const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6),x=new Date(Date.UTC(y,m-1,d));
 return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===d;
};
export function auditHistoricalPredictionInputReadiness(records,{asOfDate}={}){
 if(!Array.isArray(records)||!dateOK(asOfDate))throw Error('records[] and valid asOfDate required');
 const results=records.map((r,index)=>{
  const issues=[];
  if(!dateOK(r?.date)||r.date>=asOfDate)issues.push('invalid_or_future_race_date');
  if(!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12)issues.push('invalid_race_key');
  const boats=r?.boats;
  if(!Array.isArray(boats)||boats.length!==6||new Set(boats.map(b=>b?.boat)).size!==6||
   !boats.every(b=>Number.isInteger(b?.boat)&&b.boat>=1&&b.boat<=6))issues.push('six_distinct_boats_missing');
  for(const field of FIELDS)if(!Array.isArray(boats)||boats.length!==6||!boats.every(b=>typeof b?.[field]==='number'&&Number.isFinite(b[field])&&b[field]>=0))issues.push('missing_original_'+field);
  if(r?.historicalInputProvenanceVerified!==true)issues.push('historical_input_provenance_unverified');
  if(typeof r?.historicalInputSourceUrl!=='string'||!(()=>{try{const u=new URL(r.historicalInputSourceUrl);return u.protocol==='https:'&&(u.hostname==='boatrace.jp'||u.hostname.endsWith('.boatrace.jp'));}catch{return false;}})())issues.push('official_input_source_missing');
  if(typeof r?.historicalInputCapturedAt!=='string'||!/[zZ]|[+-]\d\d:\d\d$/.test(r.historicalInputCapturedAt)||!Number.isFinite(Date.parse(r.historicalInputCapturedAt)))issues.push('input_timestamp_unverified');
  if(typeof r?.officialCutoffAt!=='string'||!/[zZ]|[+-]\d\d:\d\d$/.test(r.officialCutoffAt)||!Number.isFinite(Date.parse(r.officialCutoffAt)))issues.push('official_cutoff_unverified');
  if(!issues.includes('input_timestamp_unverified')&&!issues.includes('official_cutoff_unverified')&&Date.parse(r.historicalInputCapturedAt)>=Date.parse(r.officialCutoffAt))issues.push('input_not_before_cutoff');
  return {index,date:r?.date??null,venue:r?.venue??null,race:r?.race??null,readyForManualEvidenceReview:issues.length===0,issues};
 });
 const missingCounts={};
 for(const row of results)for(const issue of row.issues)missingCounts[issue]=(missingCounts[issue]||0)+1;
 return {method:'historical_prediction_original_input_readiness',total:results.length,completeForManualReview:results.filter(x=>x.readyForManualEvidenceReview).length,
  missingCounts,rows:results,eligibleForScoreChange:false,
  warning:'Readiness flags and official URL assertions are not independent verification. No replay or scoring changes are authorized. Ranked output scores cannot substitute for original pre-race inputs.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,asOfDate,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/audit-historical-prediction-input-readiness.mjs <records.json> <YYYYMMDD> <report.json>');
 const report=auditHistoricalPredictionInputReadiness(JSON.parse(fs.readFileSync(input,'utf8')),{asOfDate});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({total:report.total,completeForManualReview:report.completeForManualReview,missingCounts:report.missingCounts}));
}
