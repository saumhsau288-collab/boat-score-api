#!/usr/bin/env node
// Research-only policy comparison using observed latency; never changes production capture.
import fs from 'node:fs';
const source=process.argv[2];
if(!source) { console.error('Usage: node scripts/research-capture-retry-policies.mjs <raw-capture.json>'); process.exit(2); }
const data=JSON.parse(fs.readFileSync(source,'utf8'));
if(!Array.isArray(data.records)) throw new Error('Expected raw capture records');
const policies=[{name:'current',firstMs:20000,secondMs:10000},{name:'shorter_first',firstMs:12000,secondMs:10000},{name:'longer_first',firstMs:30000,secondMs:10000}];
const validDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const seconds=(a,b)=>validDate(a)&&validDate(b)?Math.max(0,Date.parse(b)-Date.parse(a))/1000:null;
const stats=policies.map(p=>{
 let observedFirstSuccess=0, observedFirstTimeout=0, observedRetrySuccess=0, unknown=0, cannotInfer=0;
 for(const r of data.records){
  const attempts=Array.isArray(r.attempts)?r.attempts:[];
  const first=attempts[0],second=attempts[1];
  if(!first){unknown++;continue;}
  const firstSeconds=seconds(first.requestedAt,first.receivedAt);
  if(firstSeconds===null){unknown++;continue;}
  if(first.httpStatus===200 && firstSeconds*1000<=p.firstMs) observedFirstSuccess++;
  else if(first.httpStatus===200){cannotInfer++;continue;}
  else if(typeof first.error==='string'&&/timeout|timed out/i.test(first.error)){
   observedFirstTimeout++;
   if(second?.httpStatus===200){
    const secondSeconds=seconds(second.requestedAt,second.receivedAt);
    if(secondSeconds!==null && secondSeconds*1000<=p.secondMs)observedRetrySuccess++;
    else cannotInfer++;
   } else if(!second) cannotInfer++;
  } else cannotInfer++;
 }
 return {...p,observedFirstSuccess,observedFirstTimeout,observedRetrySuccess,unknown,cannotInfer};
});
console.log(JSON.stringify({source,records:data.records.length,policies:stats,warning:'Observed attempts are censored by original timeouts. This is NOT a counterfactual simulation: changing timeout may alter requests, queueing and success. Do not use these counts as predicted improvement.'},null,2));
