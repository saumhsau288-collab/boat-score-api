#!/usr/bin/env node
// Research-only: count explicit deployed predictor statements, never infer from missing data.
import fs from 'node:fs';
export function auditExplicitScoreExclusions(data) {
 if(!Array.isArray(data?.records))throw new Error('Capture records missing');
 const labels=['last50','course','weather'];
 const result={scope:'explicit_deployed_predictor_statements_only',date:data.date||null,ready:0,missingInputs:Object.fromEntries(labels.map(k=>[k,0])),explicitExclusions:Object.fromEntries(labels.map(k=>[k,0])),allThreeExplicitlyExcluded:0,readyWithoutNote:0,examples:[],warning:'A missingInputs label alone does not prove exclusion. Explicit notes are evidence of API claims, not independent proof of scoring internals or accuracy.'};
 for(const r of data.records){
  if(r.httpStatus!==200||r.response?.ready!==true)continue;
  result.ready++;
  const p=r.response,missing=new Set(Array.isArray(p.missingInputs)?p.missingInputs:[]);
  for(const k of labels)if(missing.has(k))result.missingInputs[k]++;
  if(typeof p.note!=='string'){result.readyWithoutNote++;continue;}
  if(/Course is observed but not scored; wind and last50 are excluded\./i.test(p.note)){
   for(const k of labels)result.explicitExclusions[k]++;
   result.allThreeExplicitlyExcluded++;
   if(result.examples.length<8)result.examples.push({venue:r.venue,race:r.race,missingInputs:[...missing].filter(k=>labels.includes(k))});
  }
 }
 return result;
}
if(process.argv[1]?.endsWith('/audit-explicit-score-exclusions.mjs')){
 const file=process.argv[2];if(!file)throw new Error('Provide capture JSON path');
 console.log(JSON.stringify(auditExplicitScoreExclusions(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
