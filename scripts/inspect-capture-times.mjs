// Research-only temporal sanity check. Timestamps are caller claims, NOT authenticated evidence.
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
export function inspectCaptureTimes(record){
 const p=iso(record?.predictionCapturedAt),o=iso(record?.officialCapturedAt),c=iso(record?.cutoffAt);
 const errors=[];
 if(p===null)errors.push('prediction_capture_timestamp_missing_or_invalid');
 if(o===null)errors.push('official_capture_timestamp_missing_or_invalid');
 if(c===null)errors.push('cutoff_timestamp_missing_or_invalid');
 if(p!==null&&c!==null&&p>=c)errors.push('prediction_not_before_cutoff');
 if(o!==null&&c!==null&&o>=c)errors.push('official_data_not_before_cutoff');
 // A same-race join is not sufficient to show the snapshots were contemporaneous.
 const passes=errors.length===0;
 return {status:passes?'temporal_order_plausible_unverified':'temporal_evidence_incomplete',passes,errors,
   independentlyAuthenticated:false,officialCutoffVerified:false,accuracyEligible:false,
   warning:'ISO timestamps and ordering alone do not prove collection time, official cutoff, or genuine pre-race predictions.'};
}
