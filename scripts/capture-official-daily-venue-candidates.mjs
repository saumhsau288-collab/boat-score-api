#!/usr/bin/env node
// Research-only official daily index evidence. Links are NOT verified active races.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {classifyDailyVenueEvidence} from './classify-daily-venue-evidence.mjs';
const date=process.env.CAPTURE_DATE;
if(!/^20\d{6}$/.test(date||''))throw Error('CAPTURE_DATE must be YYYYMMDD');
const url=new URL('https://www.boatrace.jp/owpc/pc/race/index');
url.searchParams.set('hd',date);
const requestedAt=new Date().toISOString();
let report;
try{
 const response=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
 const receivedAt=new Date().toISOString();
 const finalUrl=new URL(response.url||url);
 const body=await response.text();
 const sourceConsistent=response.ok&&finalUrl.protocol==='https:'&&finalUrl.hostname==='www.boatrace.jp'&&
 finalUrl.pathname==='/owpc/pc/race/index'&&/text\/html/i.test(response.headers.get('content-type')||'')&&body.length<=2_000_000;
 const evidence=sourceConsistent?classifyDailyVenueEvidence(body,{date}):null;
 report={date,requestedAt,receivedAt,sourceUrl:url.toString(),finalUrl:finalUrl.toString(),
  httpStatus:response.status,sourceConsistent,responseSha256:crypto.createHash('sha256').update(body).digest('hex'),
  ...(evidence||{linkedVenues:[],linkCount:0,verifiedActiveVenues:[],safeToFilterByActivity:false,
   authentication:'source_not_consistent'}),
  warning:'Candidate links alone do not establish a venue is active. No automatic schedule authentication or filtering.'};
}catch(error){report={date,requestedAt,status:'fetch_failed',error:String(error?.message||error),
 verifiedActiveVenues:[],safeToFilterByActivity:false};}
fs.mkdirSync('prediction-captures',{recursive:true});
const file='prediction-captures/daily-venue-candidates-'+date+'.json';
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file,sourceConsistent:report.sourceConsistent===true,linkedVenues:report.linkedVenues?.length??0,
 verifiedActiveVenues:0,safeToFilterByActivity:false,status:report.status??'captured'}));
