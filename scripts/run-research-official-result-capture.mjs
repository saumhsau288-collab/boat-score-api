#!/usr/bin/env node
// Capture official result source evidence for a specifically selected completed race.
// Never infer a six-boat finish order from raw HTML.
import fs from 'node:fs';
import {captureOfficialResultEvidence} from './capture-official-result-evidence.mjs';
const selection={date:process.env.CAPTURE_DATE,venue:process.env.CAPTURE_VENUE,race:Number(process.env.CAPTURE_RACE)};
const result=await captureOfficialResultEvidence(selection,fetch,()=>new Date().toISOString(),true);
fs.mkdirSync('prediction-captures',{recursive:true});
const prefix='prediction-captures/research-result-'+String(selection.date)+'-'+String(selection.venue)+'-'+String(selection.race);
if(typeof result.rawHtml==='string'){
 fs.writeFileSync(prefix+'.html',result.rawHtml);
 delete result.rawHtml;
}
fs.writeFileSync(prefix+'.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,sourceUrl:result.sourceUrl,sha256:result.responseSha256??null,
 finishVerified:false,eligibleForCalibration:false}));
if(result.status!=='official_result_source_captured')process.exitCode=2;
