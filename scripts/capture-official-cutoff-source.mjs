#!/usr/bin/env node
// Collect official race-list pages as independent source evidence. Do not infer cutoff times.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {extractOfficialCutoffCandidate} from './extract-official-cutoff-candidate.mjs';
import {extractCutoffFromHtmlScheduleTable} from './extract-cutoff-from-html-schedule-table.mjs';
import {inspectOfficialPageIdentity} from './inspect-official-page-identity.mjs';
import {classifyOfficialResponseSource} from './classify-official-response-source.mjs';
const files=fs.readdirSync('prediction-captures').filter(n=>/^20\d{6}-\d+\.json$/.test(n));
const rows=[];
const targets=[];
for(const file of files){
 const capture=JSON.parse(fs.readFileSync('prediction-captures/'+file,'utf8'));
 if(!/^20\d{6}$/.test(String(capture.date))||!Array.isArray(capture.records))throw new Error('Invalid prediction capture source: '+file);
 for(const record of capture.records){
  const venue=record?.venue,race=record?.race;
  if(!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)continue;
  if(record.date!==undefined&&record.date!==capture.date)continue;
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
   const identity=eligible?inspectOfficialPageIdentity(body,{date,venue,race}):{status:'official_source_not_eligible',verified:false};
   const rawCandidate=eligible?extractOfficialCutoffCandidate(body,{date,venue,race}):{status:'official_source_not_eligible'};
   // Select only the requested race's schedule column; this remains diagnostic-only.
   const scopedSchedule=eligible?extractCutoffFromHtmlScheduleTable({html:body,expectedRace:race,sourceVerified:true}):{reason:'official_source_not_eligible',cutoffJst:null};
   const raceScopedCutoffDiagnostic={candidateCutoffJst:scopedSchedule.cutoffJst,parseReason:scopedSchedule.reason,verified:false,eligibleForCalibration:false};
   // Navigation links may contain many race IDs. Never promote a global text match
   // to a race-specific candidate when the page identity is ambiguous.
   const candidate=identity.status==='identity_markers_consistent_not_authenticated'
    ?rawCandidate:{status:'candidate_suppressed_page_identity_unverified',verified:false};
   rows.push({date,venue,race,requestedAt,receivedAt:new Date().toISOString(),
    cutoffCandidate:candidate,rawCutoffCandidateForDiagnostics:rawCandidate,raceScopedCutoffDiagnostic,pageIdentity:identity,sourceCheck,finalUrl:res.url,sourceUrl:url.toString(),httpStatus:res.status,contentType:res.headers.get('content-type'),
    responseSha256:crypto.createHash('sha256').update(body).digest('hex'),
    htmlLength:body.length,htmlSample:body.slice(0,3000),
    verified:false,officialCutoffAt:null,
    note:'Race-scoped schedule value is diagnostic-only; official page identity, pre-race capture and deadline provenance not authenticated.'});
  }catch(e){rows.push({date,venue,race,requestedAt,receivedAt:new Date().toISOString(),
    cutoffCandidate:{status:'official_fetch_error'},pageIdentity:{status:'official_fetch_error',verified:false},sourceUrl:url.toString(),error:String(e.message||e),verified:false,officialCutoffAt:null});}
}
await Promise.all(Array.from({length:6},async()=>{while(cursor<uniqueTargets.length){const index=cursor++;await collect(uniqueTargets[index]);}}));
fs.writeFileSync('prediction-captures/official-cutoff-source-evidence.json',JSON.stringify({
 records:rows,verifiedCutoffs:0,candidateCutoffs:rows.filter(r=>r.cutoffCandidate?.status==='candidate_needs_official_page_identity_verification').length,warning:'Text candidates are unverified until official page identity and deadline provenance are independently checked.'},null,2)+'\n');
console.log(JSON.stringify({officialPageRequests:rows.length,http200:rows.filter(r=>r.httpStatus===200).length,verifiedCutoffs:0,candidateCutoffs:rows.filter(r=>r.cutoffCandidate?.status==='candidate_needs_official_page_identity_verification').length}));
