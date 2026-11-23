// Research-only breakdown of HTTP 200 but ready=false responses.
// Never infer absent fields are unused by the predictor or that a venue is not開催.
export function auditNotReadyResponses(archives){
 const byDay={};const byReason={};const fieldPresence={};let total=0,withReason=0;
 for(const archive of archives){
  const day=String(archive?.date??'unknown');
  const d=byDay[day]??={total:0,withReason:0,withoutReason:0};
  for(const r of Array.isArray(archive?.records)?archive.records:[]){
   if(r?.httpStatus!==200||r?.response?.ready!==false)continue;
   total++;d.total++;
   const response=r.response;
   for(const key of Object.keys(response).slice(0,100))fieldPresence[key]=(fieldPresence[key]??0)+1;
   const candidate=[response.reason,response.error,response.message,response.statusReason].find(x=>typeof x==='string'&&x.trim());
   if(candidate){withReason++;d.withReason++;const label=candidate.trim().slice(0,160);byReason[label]=(byReason[label]??0)+1;}
   else d.withoutReason++;
  }
 }
 return {total,withReason,withoutReason:total-withReason,byReason,fieldPresence,byDay,warning:'Reason strings are untrusted diagnostics, not verified causes. Missing reasons and missing fields cannot establish non開催 or source outages. No prediction accuracy inferred.'};
}
