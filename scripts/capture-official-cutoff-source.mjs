#!/usr/bin/env node
// Collect official race-list pages as independent source evidence. Do not infer cutoff times.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {extractOfficialCutoffCandidate} from './extract-official-cutoff-candidate.mjs';
import {inspectOfficialPageIdentity} from './inspect-official-page-identity.mjs';
import {classifyOfficialResponseSource} from './classify-official-response-source.mjs';
const files=fs.readdirSync('prediction-captures').filter(n=>/^20\d{6}-[^/]+\.json$/.test(n));
const rows=[];
const targets=[];
for(const file of files){
 const capture=JSON.parse(fs.readFileSync('prediction-captures/'+file,'utf8'));
 for(const record of capture.records){
  const venue=record.venue,race=record.race;
  if(!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)continue;
  targets.push({date:capture.date,venue,race});
 }
}
const uniqueTargets=[...new Map(targets.map(t=>[[t.date,t.venue,t.race].join(':'),t])).values()];
let cursor=0;
async function collect({date,venue,race}){
  const url=new URL('https://www.boatrace.jp/owpc/pc/race/racelist');
  url.search=new URLSearchParams({rno:String(race),jcd:String(venue).padStart(2,'0'),hd:date}).toString();
  const requestedAt=new Date().toISOString();
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 (compatible; BoatScore2Research/1.0)'}});
   const body=await res.text();
   const sourceCheck=classifyOfficialResponseSource({requestedUrl:url.toString(),responseUrl:res.url,httpStatus:res.status,contentType:res.headers.get('content-type')});
   const eligible=sourceCheck.status==='official_html_source_consistent_not_authenticated';
   const candidate=eligible?extractOfficialCutoffCandidate(body,{date,venue,race}):{status:'official_source_not_eligible'};
   const identity=eligible?inspectOfficialPageIdentity(body,{date,venue,race}):{status:'official_source_not_eligible',verified:false};
   rows.push({date,venue,race,requestedAt,receivedAt:new Date().toISOString(),
    cutoffCandidate:candidate,pageIdentity:identity,sourceCheck,finalUrl:res.url,sourceUrl:url.toString(),httpStatus:res.status,contentType:res.headers.get('content-type'),
    responseSha256:crypto.createHash('sha256').update(body).digest('hex'),
    htmlLength:body.length,htmlSample:body.slice(0,3000),
    verified:false,officialCutoffAt:null,
    note:'Unverified text candidate only; official page identity and deadline provenance not authenticated.'});
  }catch(e){rows.push({date,venue,race,requestedAt,receivedAt:new Date().toISOString(),
    cutoffCandidate:{status:'official_fetch_error'},pageIdentity:{status:'official_fetch_error',verified:false},sourceUrl:url.toString(),error:String(e.message||e),verified:false,officialCutoffAt:null});}
}
await Promise.all(Array.from({length:6},async()=>{while(cursor<uniqueTargets.length){const index=cursor++;await collect(uniqueTargets[index]);}}));
fs.writeFileSync('prediction-captures/official-cutoff-source-evidence.json',JSON.stringify({
 records:rows,verifiedCutoffs:0,candidateCutoffs:rows.filter(r=>r.cutoffCandidate?.status==='candidate_needs_official_page_identity_verification').length,warning:'Text candidates are unverified until official page identity and deadline provenance are independently checked.'},null,2)+'\n');
console.log(JSON.stringify({officialPageRequests:rows.length,http200:rows.filter(r=>r.httpStatus===200).length,verifiedCutoffs:0,candidateCutoffs:rows.filter(r=>r.cutoffCandidate?.status==='candidate_needs_official_page_identity_verification').length}));
