// Research-only classification. Do not infer that a non-ready race was not held.
export function classifyCaptureFailure(record){
 if(record?.httpStatus===403)return 'http_403';
 if(record?.httpStatus===429)return 'http_429';
 if(record?.httpStatus!==200){
  const attempts=Array.isArray(record?.attempts)?record.attempts:[];
  const errors=[record?.error,...attempts.map(a=>a?.error)].filter(x=>typeof x==='string').join(' ');
  if(/timeout|timed out|abort/i.test(errors))return 'timeout_or_abort';
  if(record?.httpStatus==null)return 'missing_http_response';
  return 'other_http_failure';
 }
 if(record?.response?.ready===true)return 'ready';
 if(record?.response?.ready===false)return 'not_ready_unclassified';
 return 'invalid_or_unknown_response';
}
export function summarizeCaptureFailureTypes(archives){
 const summary={total:0,byType:{},byDay:{}};
 for(const archive of archives){
  const day=String(archive?.date??'unknown');
  for(const r of Array.isArray(archive?.records)?archive.records:[]){
   const type=classifyCaptureFailure(r);
   summary.total++;
   summary.byType[type]=(summary.byType[type]||0)+1;
   const d=summary.byDay[day]??={total:0,byType:{}};
   d.total++;
   d.byType[type]=(d.byType[type]||0)+1;
  }
 }
 return {...summary,warning:'Non-ready responses do not establish non開催 status. 403, timeout, and non-ready are distinct causes; venue schedules require independently verified evidence.'};
}
