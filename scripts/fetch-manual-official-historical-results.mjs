// Fetch only explicitly selected public official result pages for historical research.
// Does not authenticate results, entry courses, racer IDs, or pre-race input features.
import fs from 'node:fs';
import crypto from 'node:crypto';
const validDate=s=>{
 if(typeof s!=='string'||!/^20\d{6}$/.test(s))return false;
 const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6),v=new Date(Date.UTC(y,m-1,d));
 return v.getUTCFullYear()===y&&v.getUTCMonth()+1===m&&v.getUTCDate()===d;
};
export function parseExplicitRaceSelection(value){
 if(typeof value!=='string')throw Error('Invalid explicit historical race selection');
 const tokens=value.split(',').map(x=>x.trim());
 // Ignore only empty values at the end of the input, e.g. '2,3,'.
 while(tokens.length>0&&tokens.at(-1)==='')tokens.pop();
 if(tokens.length===0||tokens.some(x=>!/^\d{1,2}$/.test(x)))throw Error('Invalid explicit historical race selection');
 const races=tokens.map(Number);
 if(races.length>12||races.some(n=>n<1||n>12)||new Set(races).size!==races.length)
  throw Error('Invalid explicit historical race selection');
 return races;
}
export async function fetchManualOfficialHistoricalResults({date,venue,races},{fetchImpl=fetch,timeoutMs=10000}={}){
 if(!validDate(date)||!Number.isInteger(venue)||venue<1||venue>24||
  !Array.isArray(races)||races.length<1||races.length>12||
  races.some(n=>!Number.isInteger(n)||n<1||n>12)||new Set(races).size!==races.length)throw Error('Invalid explicit historical race selection');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)throw Error('Invalid timeout');
 const pages=[];
 for(const race of races){
  const url='https://www.boatrace.jp/owpc/pc/race/raceresult?'+new URLSearchParams({rno:String(race),jcd:String(venue).padStart(2,'0'),hd:date});
  let lastError;
  let saved=false;
  for(let attempt=1;attempt<=3&&!saved;attempt++){
   try{
    const res=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{accept:'text/html'}});
    if(!res.ok||!/^text\/html(?:;|$)/i.test(res.headers.get('content-type')||''))throw Error('Unexpected response status '+res.status);
    const html=await res.text();
    if(html.length<100||html.length>2000000)throw Error('Unexpected HTML size');
    pages.push({date,venue,race,url,status:'raw_html_saved',attempts:attempt,fetchedAt:new Date().toISOString(),
     sha256:crypto.createHash('sha256').update(html).digest('hex'),html,resultVerified:false,officialCutoffVerified:false});
    saved=true;
   }catch(e){lastError=String(e?.message||e).slice(0,160);}
  }
  if(!saved)pages.push({date,venue,race,url,status:'fetch_failed',attempts:3,error:lastError,
   resultVerified:false,officialCutoffVerified:false});
 }
 return {method:'manual_historical_official_result_html_unverified',targets:races.length,pages,
  verifiedResults:0,eligibleForHistoricalReplay:0,
  warning:'These are raw public official result pages, not independently authenticated racer/course mapping or historical pre-race inputs.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [date,venue,racesArg,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/fetch-manual-official-historical-results.mjs YYYYMMDD VENUE RACES_CSV OUTPUT');
 const report=await fetchManualOfficialHistoricalResults({date,venue:Number(venue),races:parseExplicitRaceSelection(racesArg)});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({targets:report.targets,saved:report.pages.filter(p=>p.status==='raw_html_saved').length,failed:report.pages.filter(p=>p.status==='fetch_failed').length,verifiedResults:0}));
}
