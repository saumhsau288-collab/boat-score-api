#!/usr/bin/env node
// Research-only: count actual API flags; never infer a scoring effect from a missing flag.
import fs from 'node:fs';
export function auditAppliedAdjustments(data){
 if(!Array.isArray(data?.records))throw Error('Capture records missing');
 const result={date:data.date||null,ready:0,exhibitionApplied:0,startApplied:0,bothApplied:0,neitherApplied:0,
  exhibitionUnknown:0,startUnknown:0,predictionChangedTrue:0,predictionChangedFalse:0,predictionChangedUnknown:0,
  examples:[],warning:'These counts reflect deployed API flags, not independently verified scoring math, pre-race authenticity, or predictive accuracy.'};
 for(const row of data.records){
  if(row.httpStatus!==200||row.response?.ready!==true)continue;
  const p=row.response;result.ready++;
  const ex=p.exhibitionAdjustmentApplied,st=p.startAdjustmentApplied;
  if(ex===true)result.exhibitionApplied++;
  if(st===true)result.startApplied++;
  if(ex===true&&st===true)result.bothApplied++;
  if(ex===false&&st===false)result.neitherApplied++;
  if(typeof ex!=='boolean')result.exhibitionUnknown++;
  if(typeof st!=='boolean')result.startUnknown++;
  if(p.predictionChanged===true)result.predictionChangedTrue++;
  else if(p.predictionChanged===false)result.predictionChangedFalse++;
  else result.predictionChangedUnknown++;
  if(result.examples.length<12)result.examples.push({venue:row.venue,race:row.race,
    exhibitionAdjustmentApplied:ex??null,startAdjustmentApplied:st??null,predictionChanged:p.predictionChanged??null});
 }
 return result;
}
if(process.argv[1]?.endsWith('/audit-applied-adjustments.mjs')){
 const file=process.argv[2];if(!file)throw Error('Provide capture JSON path');
 console.log(JSON.stringify(auditAppliedAdjustments(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
