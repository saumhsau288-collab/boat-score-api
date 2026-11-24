// Data provenance diagnostics only.
export function auditCaptureProvenance(record) {
 const issues=[];
 const timestamp=x=>typeof x==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(x)?Date.parse(x):NaN;
 const captured=timestamp(record?.capturedAt), cutoff=timestamp(record?.cutoffAt);
 if(!Number.isFinite(captured)||!Number.isFinite(cutoff))issues.push('missing_or_invalid_timestamp');
 else if(captured>=cutoff)issues.push('capture_not_before_cutoff');
 const ids=Array.isArray(record?.racers)?record.racers.map(r=>String(r?.racerId??'')):[];
 if(ids.length!==6||ids.some(id=>!/^\d{4}$/.test(id))||new Set(ids).size!==6)issues.push('invalid_racer_identity');
 if(typeof record?.source!=='string'||!record.source.trim())issues.push('missing_source');
 return {issues,structurallyValid:issues.length===0,independentlyAuthenticated:false};
}
