#!/usr/bin/env node
// Compare captured predictor's own basePrediction with its adjusted picks; no re-prediction.
import fs from 'node:fs';
const validPick=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(p).size===3;
const validSix=a=>Array.isArray(a)&&a.length===6&&a.every(validPick)&&new Set(a.map(p=>p.join('-'))).size===6;
export function auditBaseVsAdjusted(data){
 if(!Array.isArray(data?.records))throw Error('Capture records missing');
 const result={date:data.date||null,ready:0,comparable:0,missingOrInvalidBase:0,
  mainExactOrderChanged:0,mainTicketSetChanged:0,upsetExactOrderChanged:0,upsetTicketSetChanged:0,
  eitherTicketSetChanged:0,onlyTicketOrderChanged:0,noTicketChange:0,
  predictionChangedFlagMismatch:0,byAdjustmentFlags:{},examples:[],
  warning:'Compares API-supplied basePrediction and adjusted tickets only; changed tickets are not evidence of improved accuracy.'};
 for(const r of data.records){
  if(r.httpStatus!==200||r.response?.ready!==true)continue;
  result.ready++;
  const p=r.response,b=p.basePrediction;
  if(!validSix(p.main)||!validSix(p.upset)||!validSix(b?.main)||!validSix(b?.upset)){result.missingOrInvalidBase++;continue;}
  result.comparable++;
  const orderChanged=a=>JSON.stringify(a)!==JSON.stringify(b[a===p.main?'main':'upset']);
  const setChanged=(a,c)=>a.map(x=>x.join('-')).sort().join('|')!==c.map(x=>x.join('-')).sort().join('|');
  const mainOrder=orderChanged(p.main),upsetOrder=orderChanged(p.upset);
  const mainSet=setChanged(p.main,b.main),upsetSet=setChanged(p.upset,b.upset);
  if(mainOrder)result.mainExactOrderChanged++;
  if(upsetOrder)result.upsetExactOrderChanged++;
  if(mainSet)result.mainTicketSetChanged++;
  if(upsetSet)result.upsetTicketSetChanged++;
  if(mainSet||upsetSet)result.eitherTicketSetChanged++;
  else if(mainOrder||upsetOrder)result.onlyTicketOrderChanged++;
  else result.noTicketChange++;
  const ex=p.exhibitionAdjustmentApplied===true?'yes':p.exhibitionAdjustmentApplied===false?'no':'unknown';
  const st=p.startAdjustmentApplied===true?'yes':p.startAdjustmentApplied===false?'no':'unknown';
  const flagKey='exhibition:'+ex+';start:'+st;
  const group=result.byAdjustmentFlags[flagKey]??={comparable:0,eitherSetChanged:0,orderOnlyChanged:0,noChange:0};
  group.comparable++;
  if(mainSet||upsetSet)group.eitherSetChanged++;
  else if(mainOrder||upsetOrder)group.orderOnlyChanged++;
  else group.noChange++;
  if(typeof p.predictionChanged==='boolean'&&p.predictionChanged!==(mainOrder||upsetOrder))result.predictionChangedFlagMismatch++;
  if(result.examples.length<12)result.examples.push({venue:r.venue,race:r.race,mainOrder,mainSet,upsetOrder,upsetSet,apiPredictionChanged:p.predictionChanged??null});
 }
 return result;
}
if(process.argv[1]?.endsWith('/audit-base-vs-adjusted.mjs')){
 const file=process.argv[2];if(!file)throw Error('Provide capture JSON path');
 console.log(JSON.stringify(auditBaseVsAdjusted(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
