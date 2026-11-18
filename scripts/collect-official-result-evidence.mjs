#!/usr/bin/env node
// Read-only official result source collector. Fetching a page is NOT verification of its finish order.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {extractOfficialFinishCandidate} from './extract-official-finish-candidate.mjs';
export function checkOfficialResultResponse({requestedUrl,responseUrl,httpStatus,contentType}){
 let requested,actual;
 try{requested=new URL(requestedUrl);actual=new URL(responseUrl);}catch{return {status:'invalid_url',verified:false};}
 if(requested.protocol!=='https:'||requested.hostname!=='www.boatrace.jp'||requested.pathname!=='/owpc/pc/race/raceresult')
  return {status:'unexpected_requested_url',verified:false};
 if(actual.protocol!=='https:'||actual.hostname!=='www.boatrace.jp'||actual.pathname!==requested.pathname)
  return {status:'redirected_or_unexpected_result_page',verified:false};
 for(const k of ['hd','jcd','rno']){
  const a=requested.searchParams.getAll(k),b=actual.searchParams.getAll(k);
  if(a.length!==1||b.length!==1||a[0]!==b[0])return {status:'result_race_identity_changed',verified:false};
 }
 if(httpStatus!==200)return {status:'result_http_not_200',verified:false};
 if(!/text\/html/i.test(contentType||''))return {status:'result_not_html',verified:false};
 return {status:'official_result_page_candidate_not_authenticated',verified:false};
}
export async function collectOfficialResultEvidence(capture,{fetchImpl=fetch,maxRequests=288,concurrency=6,now=new Date()}={}){
 if(!/^20\d{6}$/.test(String(capture?.date))||!Array.isArray(capture.records))throw Error('Invalid capture');
 const unique=new Map();
 for(const r of capture.records){
  if(!r||typeof r!=='object')continue;
  const date=String(r.date??capture.date),venue=Number(r.venue),race=Number(r.race);
  if(date!==String(capture.date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)continue;
  const key=[date,venue,race].join(':');unique.set(key,{date,venue,race});
 }
 const jstParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const jst=Object.fromEntries(jstParts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const todayJst=jst.year+jst.month+jst.day;
 if(String(capture.date)>=todayJst){
  return {date:capture.date,records:[],verifiedResults:0,status:'deferred_until_after_capture_date',
   warning:'Official results for today or a future date are not collected during morning capture. Run a separate retrospective collection after the date ends.'};
 }
 if(!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>288)throw Error('Invalid maxRequests');
 const targets=[...unique.values()].slice(0,maxRequests);
 const rows=new Array(targets.length);
 let next=0;
 async function collect(index){
  const {date,venue,race}=targets[index];
  const url=new URL('https://www.boatrace.jp/owpc/pc/race/raceresult');
  url.search=new URLSearchParams({rno:String(race),jcd:String(venue).padStart(2,'0'),hd:date}).toString();
  const row={date,venue,race,sourceUrl:url.toString(),verified:false,finishOrder:null,officialCutoffAt:null};
  try{
   const res=await fetchImpl(url.toString(),{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 (compatible; BoatScore2Research/1.0)'}});
   const body=await res.text();
   const sourceCheck=checkOfficialResultResponse({requestedUrl:url.toString(),responseUrl:res.url,httpStatus:res.status,contentType:res.headers.get('content-type')});
   const sourceConsistent=sourceCheck.status==='official_result_page_candidate_not_authenticated';
   Object.assign(row,{receivedAt:new Date().toISOString(),httpStatus:res.status,finalUrl:res.url,
    sourceCheck,responseSha256:crypto.createHash('sha256').update(body).digest('hex'),
    htmlLength:body.length,htmlSample:body.slice(0,3000),
    // Preserve full candidate HTML for offline parsing only when it fits; never mark it verified.
    htmlSnapshot:sourceConsistent&&body.length<=200000?body:null,
    htmlSnapshotComplete:sourceConsistent&&body.length<=200000,
    finishCandidate:sourceConsistent&&body.length<=200000?extractOfficialFinishCandidate(body):{status:'source_or_snapshot_unavailable',verified:false,top3:null}});
  }catch(e){row.error=String(e?.message||e);}
  rows[index]=row;
 }
 const workers=Math.min(targets.length,Math.max(1,Math.min(12,Math.trunc(concurrency)||1)));
 await Promise.all(Array.from({length:workers},async()=>{while(next<targets.length){const index=next++;await collect(index);}}));
 return {date:capture.date,records:rows,verifiedResults:0,warning:'Official page fetches are source candidates only. No finish order is inferred, and none may enter backtesting without independent verification.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const source=process.argv[2];
 if(!source)throw Error('Usage: node scripts/collect-official-result-evidence.mjs <capture.json>');
 const report=await collectOfficialResultEvidence(JSON.parse(fs.readFileSync(source,'utf8')));
 console.log(JSON.stringify(report,null,2));
}
