// Diagnose response readiness in historical archives without leaking response bodies.
const category=r=>{
 if(r?.httpStatus!==200)return 'http_non_200';
 if(r?.response?.ready===true)return 'ready';
 if(!r?.response||typeof r.response!=='object')return 'missing_response_object';
 return 'http_200_not_ready';
};
const key=r=>[String(r?.date??''),Number(r?.venue),Number(r?.race)].join(':');
export function diagnoseArchiveReadiness(archives,focusKeys=[]){
 const totals={ready:0,http_non_200:0,missing_response_object:0,http_200_not_ready:0};
 const statusCodes={};const shapes={};const focused=[];const notReadyReasons={};const missingHttpFields={};const missingHttpErrorCategories={};const timeoutAttempts={};const attemptValueTypes={};const dateCategories={};
 const focus=new Set(focusKeys);
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const reason=category(r);totals[reason]++;
  const day=String(a?.date??r?.date??'unknown');
  if(!dateCategories[day])dateCategories[day]={ready:0,http_non_200:0,missing_response_object:0,http_200_not_ready:0};
  dateCategories[day][reason]++;
  const code=String(r?.httpStatus??'missing');statusCodes[code]=(statusCodes[code]||0)+1;
  if(reason==='http_non_200'){
   const fields=Object.keys(r??{}).filter(k=>/error|reason|message|status|fail|attempt|retry|time/i.test(k)).sort();
   const signature=fields.join(',')||'(no diagnostic fields)';missingHttpFields[signature]=(missingHttpFields[signature]||0)+1;
   const error=r?.error;
   const label=typeof error==='string' ? (/timeout|timed out|abort/i.test(error)?'timeout_or_abort':/fetch|network|connect|dns|socket/i.test(error)?'network_or_fetch':/http|status/i.test(error)?'http_status_error':'other_string_error') : error==null?'missing_error':typeof error;
   missingHttpErrorCategories[label]=(missingHttpErrorCategories[label]||0)+1;
   const attempts=Number.isInteger(r?.attempts)&&r.attempts>=0?String(r.attempts):'not_recorded';
   timeoutAttempts[attempts]=(timeoutAttempts[attempts]||0)+1;
   const t=Array.isArray(r?.attempts)?'array':r?.attempts===undefined?'absent':r?.attempts===null?'null':typeof r.attempts;
   attemptValueTypes[t]=(attemptValueTypes[t]||0)+1;
  }
  if(reason==='http_200_not_ready'){
   const raw=r.response.reason;
   const label=typeof raw==='string'&&raw.length<=100?raw:(raw==null?'(missing)':typeof raw);
   notReadyReasons[label]=(notReadyReasons[label]||0)+1;
   const fields=Object.keys(r.response).filter(k=>/^(ready|error|status|reason|message|missing|source|code|detail|diagnostic|stage)$/i.test(k)).sort();
   const signature=fields.join(',')||'(no diagnostic fields)';
   shapes[signature]=(shapes[signature]||0)+1;
  }
  if(focus.has(key(r)))focused.push({raceKey:key(r),category:reason,httpStatus:r?.httpStatus??null,
   responseReady:r?.response?.ready===true,diagnosticFieldNames:r?.response&&typeof r.response==='object'?
    Object.keys(r.response).filter(k=>/^(ready|error|status|reason|message|missing|source|code|detail|diagnostic|stage)$/i.test(k)).sort():[]});
 }
 return {totals,statusCodes,nonReadyReasons:notReadyReasons,missingHttpDiagnosticFieldShapes:missingHttpFields,missingHttpErrorCategories,timeoutAttempts,attemptValueTypes,dateCategories,nonReadyDiagnosticFieldShapes:shapes,focused,warning:'Status and field names only; no cause inferred without evidence. Historical responses are not authenticated pre-race predictions.'};
}
