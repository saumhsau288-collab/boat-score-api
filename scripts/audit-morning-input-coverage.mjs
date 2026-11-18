#!/usr/bin/env node
// Audit deployed API responses. "ready" does not imply all required inputs were present.
import fs from 'node:fs';
const file=process.argv[2];
if(!file)throw new Error('Usage: node scripts/audit-morning-input-coverage.mjs <capture.json>');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const counts={attempted:0,ready:0,readyWithMissingInputs:0,readyWithNoMissingInputs:0,
 timeout:0,otherNetworkErrors:0,unverifiedOfficialSixBoatStats:0,otherNotReady:0,non200:0};
const missing={},venues={};
for(const row of data.records){
 counts.attempted++;
 const v=String(row.venue);
 venues[v]??={attempted:0,ready:0,timeout:0,notReady:0};
 venues[v].attempted++;
 if(row.error){
   if(/timeout|timed out/i.test(row.error)){counts.timeout++;venues[v].timeout++;}
   else counts.otherNetworkErrors++;
   continue;
 }
 if(row.httpStatus!==200){counts.non200++;continue;}
 const response=row.response;
 if(response?.ready===true){
   counts.ready++;venues[v].ready++;
   const fields=Array.isArray(response.missingInputs)?[...new Set(response.missingInputs.map(String))]:null;
   if(fields===null||fields.length){counts.readyWithMissingInputs++;for(const name of fields||['missingInputs_not_reported'])missing[name]=(missing[name]||0)+1;}
   else counts.readyWithNoMissingInputs++;
 }else{
   venues[v].notReady++;
   if(response?.reason==='official_six_boat_stats_unverified')counts.unverifiedOfficialSixBoatStats++;
   else counts.otherNotReady++;
 }
}
if(counts.attempted!==data.attempted)throw new Error('Capture count mismatch');
const result={date:data.date,counts,missingInputsAmongReady:missing,byVenue:venues,
 warning:'Ready forecasts may lack mandatory input data. This audit is not prediction accuracy and does not authenticate pre-race capture.'};
console.log(JSON.stringify(result,null,2));
