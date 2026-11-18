#!/usr/bin/env node
// Research-only structural audit of deployed predictor responses; no inferred input values.
import fs from 'node:fs';
export function auditResponseShape(capture){
 if(!capture||!Array.isArray(capture.records)||capture.authenticatedBeforeRace!==false)
  throw Error('Invalid raw capture provenance');
 const ready=capture.records.filter(r=>r.response?.ready===true);
 const counts={};const nested={};
 for(const record of ready){
  for(const [key,value] of Object.entries(record.response)){
   counts[key]=(counts[key]||0)+1;
   if(value&&typeof value==='object'&&!Array.isArray(value)){
    for(const sub of Object.keys(value).slice(0,100)){
     const label=key+'.'+sub;nested[label]=(nested[label]||0)+1;
    }
   }
  }
 }
 const relevant=Object.keys({...counts,...nested}).filter(k=>/score|input|recent|50|exhib|motor|rate|course|st|weather|last|missing|evidence/i.test(k)).sort();
 return {scope:'DEPLOYED_RESPONSE_FIELD_NAME_DISCOVERY_ONLY',date:capture.date,
  readyResponsesInspected:ready.length,topLevelKeys:counts,nestedKeys:nested,
  possibleScoreInputFieldNames:relevant,scoreInputValuesExtracted:false,
  independentlyAuthenticatedBeforeRace:false,accuracyCalculationPermitted:false,
  warning:'Field names only; no assumptions that absent fields imply inputs were unused. Do not infer pre-race timing or alter scoring.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const path=process.argv[2];if(!path)throw Error('Usage: node scripts/audit-capture-response-shapes.mjs capture.json');
 console.log(JSON.stringify(auditResponseShape(JSON.parse(fs.readFileSync(path,'utf8'))),null,2));
}
