// Research-only nested diagnostics for HTTP 200 ready=false.
// These fields describe the deployed API's assertions, not independently verified upstream facts.
const label=v=>v===undefined?'missing':v===null?'null':typeof v==='string'?v.slice(0,120):typeof v==='boolean'?String(v):typeof v==='number'&&Number.isFinite(v)?String(v):Array.isArray(v)?'array':typeof v==='object'?'object':'other';
export function auditNotReadyOfficialStats(archives){
 const fields=['officialStatsRetry','officialVerified','statsVerified','missingInputs'];
 const counts=Object.fromEntries(fields.map(f=>[f,{}]));
 let total=0;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  if(r?.httpStatus!==200||r?.response?.ready!==false)continue;
  total++;
  for(const f of fields){const v=label(r.response[f]);counts[f][v]=(counts[f][v]??0)+1;}
 }
 return {total,counts,warning:'Values are untrusted response assertions. In particular officialStatsRetry is not an independently verified HTTP result, and missingInputs array contents are not counted here.'};
}
