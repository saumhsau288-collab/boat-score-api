// Research only: fetch historical official entry-list HTML, not a certified pre-cutoff snapshot.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseExplicitRaceSelection} from './fetch-manual-official-historical-results.mjs';
export async function fetchHistoricalEntryLists({date,venue,races},{fetchImpl=fetch,timeoutMs=9000}={}){
 if(!/^20\\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||
 !Array.isArray(races)||races.length<1||races.length>12||new Set(races).size!==races.length||
 races.some(n=>!Number.isInteger(n)||n<1||n>12))throw Error('Invalid selection');
 const pages=[];
 for(const race of races){
  const url='https://www.boatrace.jp/owpc/pc/race/racelist?'+new URLSearchParams({rno:String(race),jcd:String(venue).padStart(2,'0'),hd:date});
  try{
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(timeoutMs),redirect:'error',headers:{accept:'text/html'}});
   if(!response.ok||!/^text\\/html(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('Unexpected response');
   const html=await response.text();
   if(html.length<100||html.length>2000000)throw Error('Unexpected HTML size');
   pages.push({date,venue,race,url,status:'raw_historical_entry_html',fetchedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex'),html,preCutoffSnapshotVerified:false,winRatesVerified:false});
  }catch(e){pages.push({date,venue,race,url,status:'fetch_failed',error:String(e?.message||e).slice(0,180),preCutoffSnapshotVerified:false,winRatesVerified:false});}
 }
 return {method:'exploratory_official_historical_entry_html',pages,eligibleForCalibration:0,warning:'Retrieved historical pages are not authenticated pre-cutoff snapshots. Do not tune model weights from these without independent verification.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [date,venue,racesArg,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: YYYYMMDD VENUE RACES_CSV OUTPUT');
 const report=await fetchHistoricalEntryLists({date,venue:Number(venue),races:parseExplicitRaceSelection(racesArg)});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\\n');
 console.log(JSON.stringify({targets:report.pages.length,saved:report.pages.filter(p=>p.status==='raw_historical_entry_html').length,failed:report.pages.filter(p=>p.status==='fetch_failed').length,eligibleForCalibration:0}));
}
