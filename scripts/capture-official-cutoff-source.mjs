#!/usr/bin/env node
// Collect official race-list pages as independent source evidence. Do not infer cutoff times.
import fs from 'node:fs';
import crypto from 'node:crypto';
const files=fs.readdirSync('prediction-captures').filter(n=>/^20\d{6}-[^/]+\.json$/.test(n));
const rows=[];
for(const file of files){
 const capture=JSON.parse(fs.readFileSync('prediction-captures/'+file,'utf8'));
 const unique=[...new Set(capture.records.map(r=>r.venue))].filter(v=>Number.isInteger(v)&&v>=1&&v<=24);
 for(const venue of unique){
  const url=new URL('https://www.boatrace.jp/owpc/pc/race/racelist');
  url.search=new URLSearchParams({rno:'1',jcd:String(venue).padStart(2,'0'),hd:capture.date}).toString();
  const requestedAt=new Date().toISOString();
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 (compatible; BoatScore2Research/1.0)'}});
   const body=await res.text();
   rows.push({date:capture.date,venue,requestedAt,receivedAt:new Date().toISOString(),
    sourceUrl:url.toString(),httpStatus:res.status,contentType:res.headers.get('content-type'),
    responseSha256:crypto.createHash('sha256').update(body).digest('hex'),
    htmlLength:body.length,htmlSample:body.slice(0,3000),
    verified:false,officialCutoffAt:null,
    note:'Official domain fetch evidence only; no deadline extracted or independently verified.'});
  }catch(e){rows.push({date:capture.date,venue,requestedAt,receivedAt:new Date().toISOString(),
    sourceUrl:url.toString(),error:String(e.message||e),verified:false,officialCutoffAt:null});}
 }
}
fs.writeFileSync('prediction-captures/official-cutoff-source-evidence.json',JSON.stringify({
 records:rows,verifiedCutoffs:0,warning:'Official page responses are not yet parsed or verified as race-specific cutoff times.'},null,2)+'\n');
console.log(JSON.stringify({officialPageRequests:rows.length,http200:rows.filter(r=>r.httpStatus===200).length,verifiedCutoffs:0}));
