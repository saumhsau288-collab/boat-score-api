#!/usr/bin/env node
// Read-only audit: do captured predictions contain independently inspectable per-boat score inputs?
import fs from 'node:fs';
const fields=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
const limits=[10,10,100,100,100];
export function auditCaptureScoreInputs(data){
 if(!data||!Array.isArray(data.records)||data.records.length!==data.attempted||
    data.authenticatedBeforeRace!==false)throw Error('Invalid or overclaimed raw capture');
 const totals=Object.fromEntries(fields.map(k=>[k,0]));
 let ready=0,complete=0,missingEvidence=0,invalid=0;
 for(const record of data.records){
  if(record.response?.ready!==true)continue;
  ready++;
  // The existing deployed API has no guaranteed score-input schema.
  // Only a clearly identified six-boat object with all five fields qualifies.
  const boats=record.response?.scoreInputsByBoat;
  if(!Array.isArray(boats)||boats.length!==6||
     new Set(boats.map(r=>r?.boat)).size!==6||
     boats.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6)){
    missingEvidence++;continue;
  }
  let all=true;
  for(const boat of boats)for(let i=0;i<fields.length;i++){
   const value=boat[fields[i]];
   const valid=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=limits[i];
   totals[fields[i]]+=Number(valid);
   all=all&&valid;
  }
  if(all)complete++;else invalid++;
 }
 return {scope:'RAW_CAPTURE_SCORE_INPUT_EVIDENCE_AUDIT',date:data.date,
  readyPredictions:ready,readyWithExplicitSixBoatInputEvidence:ready-missingEvidence,
  readyMissingInputEvidence:missingEvidence,readyInvalidOrIncompleteInputs:invalid,
  readyCompleteFiveInputs:complete,validRacerFieldCounts:totals,
  independentlyAuthenticatedBeforeRace:0,accuracyCalculationPermitted:false,
  weightChangesPermitted:false,
  warning:'Only response.scoreInputsByBoat is inspected; other deployed API formats may contain inputs elsewhere. Absence is not proof inputs were unused. This does not prove pre-race timing or authorize scoring changes.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];if(!file)throw Error('Usage: node scripts/audit-capture-score-inputs.mjs capture.json');
 console.log(JSON.stringify(auditCaptureScoreInputs(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
