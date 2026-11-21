// Explicitly validate prospective snapshot timestamps. Never infer timing from archive date.
export function validatePreRaceSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object')return {valid:false,reason:'missing_snapshot'};
 const {capturedAt,scheduledStartAt,source}=snapshot;
 if(typeof capturedAt!=='string'||typeof scheduledStartAt!=='string'||!/Z$|[+-]\d\d:\d\d$/.test(capturedAt)||!/Z$|[+-]\d\d:\d\d$/.test(scheduledStartAt))return {valid:false,reason:'missing_offset_aware_timestamps'};
 const captured=Date.parse(capturedAt),start=Date.parse(scheduledStartAt);
 if(!Number.isFinite(captured)||!Number.isFinite(start))return {valid:false,reason:'invalid_timestamp'};
 if(typeof source!=='string'||!source.trim())return {valid:false,reason:'missing_source'};
 if(captured>=start)return {valid:false,reason:'not_before_start'};
 return {valid:true,leadSeconds:(start-captured)/1000};
}
export function auditSnapshotTiming(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const counts={total:records.length,valid:0,missing_snapshot:0,missing_offset_aware_timestamps:0,invalid_timestamp:0,missing_source:0,not_before_start:0};
 for(const r of records){const v=validatePreRaceSnapshot(r?.preRaceSnapshot);if(v.valid)counts.valid++;else counts[v.reason]++;}
 return {...counts,warning:'Timing validation alone does not verify the source data or whether all required racer fields were captured.'};
}
