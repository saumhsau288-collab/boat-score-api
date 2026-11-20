#!/usr/bin/env node
// Research-only official schedule discovery. Candidate venue links are NOT authenticated active venues.
import fs from 'node:fs';
import crypto from 'node:crypto';
const date=process.env.CAPTURE_DATE;
if(!/^20\d{6}$/.test(date||''))throw Error('CAPTURE_DATE must be YYYYMMDD');
const url=new URL('https://www.boatrace.jp/owpc/pc/race/index');
url.searchParams.set('hd',date);
const requestedAt=new Date().toISOString();
let report={date,sourceUrl:url.toString(),requestedAt,verifiedActiveVenues:[],
 safeToFilterByActivity:false,authentication:'not_verified',status:'not_checked'};
try{
 const response=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
 const html=await response.text(),receivedAt=new Date().toISOString();
 const final=new URL(response.url||url);
 const official=final.protocol==='https:'&&final.hostname==='www.boatrace.jp'&&final.pathname==='/owpc/pc/race/index';
 const valid=official&&response.ok&&/text\/html/i.test(response.headers.get('content-type')||'')&&html.length<=2_000_000;
 const candidates=[];
 if(valid){
  for(const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)){
   try{
    const link=new URL(match[1],final);
    if(link.hostname!=='www.boatrace.jp'||!link.pathname.startsWith('/owpc/pc/race/'))continue;
    if(link.searchParams.get('hd')!==date)continue;
    const jcd=link.searchParams.get('jcd');
    if(!/^\d{1,2}$/.test(jcd||''))continue;
    const venue=Number(jcd);
    if(venue>=1&&venue<=24)candidates.push(venue);
   }catch{}
  }
 }
 report={...report,receivedAt,httpStatus:response.status,finalUrl:final.toString(),
  responseSha256:crypto.createHash('sha256').update(html).digest('hex'),
  status:valid?'unverified_schedule_link_candidates':'invalid_official_schedule_response',
  candidateVenueLinks:[...new Set(candidates)].sort((a,b)=>a-b),
  note:'Links in an official-looking HTML response do not prove a venue is holding races; independent authentication and explicit schedule interpretation required.'};
}catch(e){report={...report,status:'fetch_failed',error:String(e.message||e)};}
fs.mkdirSync('prediction-captures',{recursive:true});
const file='prediction-captures/research-schedule-'+date+'.json';
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file,status:report.status,candidateVenueLinks:report.candidateVenueLinks?.length||0,verifiedActiveVenues:0}));
