// Research-only offline reader of saved GitHub Actions JSON. No fetch or score changes.
import fs from 'node:fs';
import {describeSavedBaseStatsReadiness} from './describe-saved-base-stats-readiness.mjs';
export function diagnoseSavedPredictions(payload){
 const entries=Array.isArray(payload)?payload:Array.isArray(payload?.captures)?payload.captures:Array.isArray(payload?.results)?payload.results:Array.isArray(payload?.records)?payload.records.filter(x=>x?.response?.ready===true&&!(Number(x.venue)===9&&Number(x.race)===6)):null;
 if(!entries)return {status:'held',reason:'saved_prediction_array_required',rows:[],eligibleForCalibration:false};
 const rows=entries.map((item,index)=>{
  const prediction=item?.prediction??item;
  const mode=prediction?.response?.predictionMode??prediction?.predictionMode??null;
  const result=describeSavedBaseStatsReadiness({prediction,deadlineAt:item?.deadlineAt});
  return {index,date:item?.date??null,venue:item?.venue??null,race:item?.race??null,predictionMode:mode,
   status:result.status,verifiedCount:result.verifiedCount,requiredCount:result.requiredCount,
   missingSources:result.rows.filter(x=>x.status==='held').map(x=>({source:x.source,reason:x.reason})),
   eligibleForCalibration:false};
 });
 return {status:'diagnosed',count:rows.length,rows,eligibleForCalibration:false,scoreChangeApplied:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/diagnose-saved-predictions.mjs input.json output.json');
 const result=diagnoseSavedPredictions(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,count:result.count??0,eligibleForCalibration:false}));
 if(result.status!=='diagnosed')process.exitCode=2;
}
