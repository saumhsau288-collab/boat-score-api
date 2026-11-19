// Research-only classification: preserve the origin of each prediction.
export function classifyPredictionPhase(snapshot){
 if(!snapshot||typeof snapshot!=='object')return {phase:null,reason:'missing_snapshot'};
 const capture=Date.parse(snapshot.capturedAt),cutoff=Date.parse(snapshot.cutoffAt);
 if(!Number.isFinite(capture)||!Number.isFinite(cutoff)||capture>=cutoff)return {phase:null,reason:'not_pre_cutoff'};
 const local=/^\d{4}-\d\d-\d\dT(\d\d):(\d\d):/.exec(String(snapshot.capturedAt));
 if(snapshot.phase==='morning_8am'){
  if(!local||local[1]!=='08'||Number(local[2])>15)return {phase:null,reason:'invalid_morning_capture_window'};
  return {phase:'morning_8am',reason:null};
 }
 if(snapshot.phase==='precutoff_10min'){
  const minutesBefore=(cutoff-capture)/60000;
  if(minutesBefore<5||minutesBefore>15)return {phase:null,reason:'invalid_precutoff_capture_window'};
  return {phase:'precutoff_10min',reason:null};
 }
 return {phase:null,reason:'unknown_phase'};
}
