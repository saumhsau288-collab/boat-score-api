#!/usr/bin/env node
// Research-only on-demand capture. Saves source metadata, never raw HTML or invented boat data.
import fs from 'node:fs';
import {captureOfficialBeforeinfo} from './capture-official-beforeinfo-evidence.mjs';
const date=process.env.CAPTURE_DATE;
const venue=process.env.CAPTURE_VENUE;
const race=process.env.CAPTURE_RACE;
const result=await captureOfficialBeforeinfo({date,venue,race});
if(result.status==='invalid_selection'){
 console.error(JSON.stringify(result));
 process.exitCode=2;
}else{
 const file='prediction-captures/research-beforeinfo-'+date+'-'+String(Number(venue)).padStart(2,'0')+'-'+Number(race)+'.json';
 fs.mkdirSync('prediction-captures',{recursive:true});
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({file,status:result.status,sourceUrl:result.sourceUrl,
  receivedAt:result.receivedAt??null,responseSha256:result.responseSha256??null,
  verified:false,eligibleForCalibration:false}));
 if(result.status!=='beforeinfo_source_captured')process.exitCode=2;
}
