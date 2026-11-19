// One-race archival acquisition of official historical entry list for research.
// Saves original HTML with SHA-256; never asserts that today-visible values were pre-cutoff.
import fs from 'node:fs';
import crypto from 'node:crypto';
export async function fetchHistoricalRacelistSample({date='20261118',venue=18,race=2,fetchImpl=fetch}={}){
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)throw Error('Invalid target');
 const url='https://www.boatrace.jp/owpc/pc/race/racelist?'+new URLSearchParams({rno:String(race),jcd:String(venue).padStart(2,'0'),hd:date});
 try{
  const res=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{accept:'text/html'}});
  if(!res.ok||!/^text\/html(?:;|$)/i.test(res.headers.get('content-type')||''))throw Error('Unexpected HTTP response');
  const html=await res.text();
  if(html.length<100||html.length>2000000)throw Error('Unexpected HTML size');
  return {status:'raw_html_saved',date,venue,race,url,sha256:crypto.createHash('sha256').update(html).digest('hex'),fetchedAt:new Date().toISOString(),html,preCutoffSnapshotAuthenticated:false,eligibleForWeightTuning:false};
 }catch(e){return {status:'fetch_failed',date,venue,race,url,error:String(e.message).slice(0,160),eligibleForWeightTuning:false};}
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [output,date='20261118',venue='18',race='2']=process.argv.slice(2);if(!output)throw Error('Output file required');
 const data=await fetchHistoricalRacelistSample({date,venue:Number(venue),race:Number(race)});
 fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({status:data.status,sha256:data.sha256||null,error:data.error||null}));
}
