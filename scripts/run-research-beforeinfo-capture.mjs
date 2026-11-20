#!/usr/bin/env node
// Research-only on-demand capture. Saves source metadata, never raw HTML or invented boat data.
import fs from 'node:fs';
import {captureOfficialBeforeinfo} from './capture-official-beforeinfo-evidence.mjs';
const date=process.env.CAPTURE_DATE;
const venue=process.env.CAPTURE_VENUE;
const race=process.env.CAPTURE_RACE;
const result=await captureOfficialBeforeinfo({date,venue,race},fetch,()=>new Date().toISOString(),true);
if(result.status==='invalid_selection'){
 console.error(JSON.stringify(result));
 process.exitCode=2;
}else{
 const file='prediction-captures/research-beforeinfo-'+date+'-'+String(Number(venue)).padStart(2,'0')+'-'+Number(race)+'.json';
 fs.mkdirSync('prediction-captures',{recursive:true});
 const {rawHtml,...metadata}=result;
 fs.writeFileSync(file,JSON.stringify(metadata,null,2)+'\n');
 if(typeof rawHtml==='string'){
  const htmlFile=file.replace(/\.json$/,'.html');
  fs.writeFileSync(htmlFile,rawHtml);
  console.log(JSON.stringify({htmlFile,bodyBytes:Buffer.byteLength(rawHtml,'utf8')}));
 }
 console.log(JSON.stringify({file,status:result.status,sourceUrl:result.sourceUrl,
  receivedAt:result.receivedAt??null,responseSha256:result.responseSha256??null,
  verified:false,eligibleForCalibration:false}));
 if(result.status!=='beforeinfo_source_captured')process.exitCode=2;
}
