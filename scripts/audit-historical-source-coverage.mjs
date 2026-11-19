// Research-only audit: count historical records that actually have all required
// original pre-race inputs, verified finish order and independent entry courses.
// Does not treat a source URL or a boolean flag as independent authentication.
import fs from 'node:fs';
const fields=['nationalWinRate','localWinRate','averageStartTiming','entryCourse'];
export function auditHistoricalSourceCoverage(rows){
 if(!Array.isArray(rows))throw Error('Expected historical race array');
 const report={total:rows.length,completeFeatureRows:0,missingByField:Object.fromEntries(fields.map(k=>[k,0])),missingSixRacers:0,missingOfficialResults:0,missingIndependentCourseEvidence:0,independentlyAuthenticated:0,eligibleForWeightTuning:0,examples:[]};
 for(const row of rows){
  const racers=Array.isArray(row?.racers)&&row.racers.length===6?row.racers:null;
  if(!racers)report.missingSixRacers++;
  for(const field of fields){
   const valid=racers&&racers.every(r=>{
    const v=r?.[field];return typeof v==='number'&&Number.isFinite(v)&&
     (field==='entryCourse'?Number.isInteger(v)&&v>=1&&v<=6:
      field==='averageStartTiming'?v>=0&&v<=1:v>=0&&v<=10);
   });
   if(!valid)report.missingByField[field]++;
  }
  const complete=!!racers&&fields.every(field=>racers.every(r=>{
   const v=r?.[field];return typeof v==='number'&&Number.isFinite(v)&&
    (field==='entryCourse'?Number.isInteger(v)&&v>=1&&v<=6:
     field==='averageStartTiming'?v>=0&&v<=1:v>=0&&v<=10);
  }))&&new Set(racers.map(r=>r.entryCourse)).size===6;
  if(complete)report.completeFeatureRows++;
  if(!Array.isArray(row?.finishOrder)||row.finishOrder.length!==6||new Set(row.finishOrder).size!==6)report.missingOfficialResults++;
  if(row?.entryCourseSource!=='verified_pre_race')report.missingIndependentCourseEvidence++;
  if(report.examples.length<5&&!complete)report.examples.push({date:row?.date??null,venue:row?.venue??null,race:row?.race??null,reason:'missing_or_invalid_six_racer_features'});
 }
 return {...report,note:'Feature completeness is not independent source authentication. No record is automatically eligible for tuning.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/audit-historical-source-coverage.mjs INPUT_JSON OUTPUT_JSON');
 const data=JSON.parse(fs.readFileSync(input,'utf8'));
 const report=auditHistoricalSourceCoverage(Array.isArray(data)?data:data.rows);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\\n');
 console.log(JSON.stringify(report));
}
