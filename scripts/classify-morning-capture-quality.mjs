#!/usr/bin/env node
// Classify capture data quality, never calculate accuracy or assert independent provenance.
import fs from 'node:fs';
const filename=process.argv[2];
if(!filename)throw new Error('Usage: node scripts/classify-morning-capture-quality.mjs <capture.json>');
const data=JSON.parse(fs.readFileSync(filename,'utf8'));
if(data.authenticatedBeforeRace!==false)throw new Error('Capture must remain unauthenticated');
const valid=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(p).size===3;
const six=a=>Array.isArray(a)&&a.length===6&&a.every(valid)&&new Set(a.map(p=>p.join('-'))).size===6;
const groups={networkFailure:[],httpFailure:[],notReady:[],invalidTickets:[],readyMissingInputEvidence:[],readyMissingInputs:[],readyNoReportedMissingInputs:[]};
for(const r of data.records){
 const identity={date:r.date,venue:r.venue,race:r.race};
 if(r.error){groups.networkFailure.push(identity);continue;}
 if(r.httpStatus!==200){groups.httpFailure.push(identity);continue;}
 if(r.response?.ready!==true){groups.notReady.push(identity);continue;}
 if(!six(r.response.main)||!six(r.response.upset)){groups.invalidTickets.push(identity);continue;}
 if(!Array.isArray(r.response.missingInputs)){groups.readyMissingInputEvidence.push(identity);continue;}
 if(r.response.missingInputs.length){groups.readyMissingInputs.push({...identity,missingInputs:r.response.missingInputs});continue;}
 groups.readyNoReportedMissingInputs.push(identity);
}
const counts=Object.fromEntries(Object.entries(groups).map(([name,items])=>[name,items.length]));
if(Object.values(counts).reduce((a,b)=>a+b,0)!==data.attempted)throw new Error('Classification count mismatch');
const result={date:data.date,counts,groups,authenticatedBeforeRace:false,accuracyCalculationPermitted:false,
 warning:'No reported missing inputs is not proof of complete data or authentic pre-race prediction. Do not tune weights or report hit rates.'};
console.log(JSON.stringify(result,null,2));
