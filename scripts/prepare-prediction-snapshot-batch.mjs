// Research-only append-only snapshot batch preparation. No external persistence.
import {formatPredictionSnapshot} from './format-prediction-snapshot.mjs';
export function preparePredictionSnapshotBatch(inputs,existing=[]){
 const accepted=[],rejected=[],seen=new Set();
 for(const old of existing??[]){
  const check=formatPredictionSnapshot(old);
  if(check.accepted)seen.add([check.record.date,check.record.venue,check.record.race,check.record.phase].join(':'));
 }
 for(const input of inputs??[]){
  const check=formatPredictionSnapshot(input);
  const key=input?.date+':'+input?.venue+':'+input?.race+':'+input?.phase;
  if(!check.accepted){rejected.push({key,reasons:check.errors});continue;}
  if(seen.has(key)){rejected.push({key,reasons:['already_recorded_phase']});continue;}
  seen.add(key);
  accepted.push(check.record);
 }
 return {accepted,rejected,existingCount:existing?.length??0};
}
