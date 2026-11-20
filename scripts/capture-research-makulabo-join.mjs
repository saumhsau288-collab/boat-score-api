#!/usr/bin/env node
// Research-only live public Makulabo check for the selected official snapshot.
// Does not modify the app, use credentials, or invent missing 50-run evidence.
import fs from 'node:fs';
import {runSavedMakulaboResearch} from './run-saved-makulabo-research.mjs';
const date=process.env.CAPTURE_DATE;
const venue=Number(process.env.CAPTURE_VENUE);
const race=Number(process.env.CAPTURE_RACE);
if(!/^20\d{6}$/.test(date??'')||!Number.isInteger(venue)||venue<1||venue>24||
 !Number.isInteger(race)||race<1||race>12)throw Error('invalid_capture_selection');
const file='prediction-captures/research-makulabo-'+date+'-'+venue+'-'+race+'.json';
const officialPath='prediction-captures/research-official-'+date+'-'+venue+'-'+race+'.json';
let result;
if(!fs.existsSync(officialPath)){
 result={status:'held',reason:'official_snapshot_missing',eligibleForCalibration:false};
}else{
 const snapshot=JSON.parse(fs.readFileSync(officialPath,'utf8'));
 const url='https://makulabo-jp.com/data/'+String(venue).padStart(2,'0')+'/'+race+'/heatmap?hd='+date;
 try{
  const response=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(15000)});
  const html=await response.text();
  if(!response.ok||!(/text\/html/i.test(response.headers.get('content-type')||''))||html.length>2_000_000)
   result={status:'held',reason:'makulabo_public_html_unavailable',httpStatus:response.status,eligibleForCalibration:false};
  else result={...runSavedMakulaboResearch(snapshot,html),httpStatus:response.status};
 }catch(error){
  result={status:'held',reason:'makulabo_public_fetch_failed',errorType:error?.name??'Error',eligibleForCalibration:false};
 }
}
fs.mkdirSync('prediction-captures',{recursive:true});
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,status:result.status,reason:result.reason??null,
 racers:result.racers?.length??0,morningScoreApplied:result.morningScoreApplied===true,
 eligibleForCalibration:false}));
// Research source availability does not change the official capture success gate.
