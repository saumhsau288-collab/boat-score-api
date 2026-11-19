// Research only: download raw official-result HTML as evidence candidates.
// Raw HTML is not authenticated official finish order or a verified cutoff.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {buildOfficialResultRequestManifest} from './build-official-result-request-manifest.mjs';
const officialHost=url=>{
 try {const u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&!u.username&&!u.password;}
 catch{return false;}
};
export async function fetchOfficialResultPages(capture,{fetchImpl=fetch,limit=12,timeoutMs=10000,maxAttempts=2}={}){
 if(!Number.isInteger(limit)||limit<1||limit>24)throw Error('Limit must be 1..24');
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)throw Error('Attempts must be 1..3');
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)throw Error('Timeout must be 100..60000 ms');
 const manifest=buildOfficialResultRequestManifest(capture);
 const readyKeys=new Set(capture.records.filter(r=>r.response?.ready===true).map(r=>[r.date,Number(r.venue),Number(r.race)].join(':')));
 const targets=manifest.requests.filter(r=>readyKeys.has([r.date,r.venue,r.race].join(':'))&&!r.duplicateCaptureKey).slice(0,limit);
 const pages=[];
 for(const target of targets){
  const url=target.officialResultPageUrl;
  if(!officialHost(url))throw Error('Unexpected result URL');
  const attempts=[];
  for(let attempt=1;attempt<=maxAttempts;attempt++){
  try {
   const res=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{accept:'text/html'}});
   const contentType=res.headers.get('content-type')||'';
   if(!res.ok||!/^text\/html(?:;|$)/i.test(contentType))throw Error('Unexpected status or content type');
   const html=await res.text();
   if(html.length<100||html.length>2000000)throw Error('Unexpected HTML size');
   attempts.push({attempt,status:'saved'});
   pages.push({date:target.date,venue:target.venue,race:target.race,url,status:'raw_html_saved',attempts,
    fetchedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex'),
    html,resultVerified:false,officialCutoffVerified:false});
   break;
  }catch(e){
   const error=String(e.message||e).slice(0,160);
   attempts.push({attempt,status:'failed',error});
   if(attempt===maxAttempts)pages.push({date:target.date,venue:target.venue,race:target.race,url,status:'fetch_failed',attempts,error,resultVerified:false,officialCutoffVerified:false});
  }
  }
 }
 return {method:'raw_official_result_page_retrieval_unverified',targets:targets.length,pages,
  verifiedResults:0,eligibleForAccuracy:0,
  warning:'Downloaded pages have not been authenticated against race identity or parsed into independently verified finish order. No accuracy or calibration claims.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [capturePath,outputPath]=process.argv.slice(2);
 if(!capturePath||!outputPath)throw Error('Usage: node scripts/fetch-official-result-pages-research.mjs <capture.json> <output.json>');
 const report=await fetchOfficialResultPages(JSON.parse(fs.readFileSync(capturePath,'utf8')));
 fs.writeFileSync(outputPath,JSON.stringify(report,null,2));
 console.log(JSON.stringify({targets:report.targets,saved:report.pages.filter(p=>p.status==='raw_html_saved').length,failed:report.pages.filter(p=>p.status==='fetch_failed').length,verifiedResults:0}));
}
