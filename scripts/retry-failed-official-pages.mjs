// Research-only: retry failed public official result pages once, preserving original failures.
// No result authentication or historical accuracy claims.
import fs from 'node:fs';
import {fetchManualOfficialHistoricalResults} from './fetch-manual-official-historical-results.mjs';
export async function retryFailedOfficialPages(report,{fetcher=fetchManualOfficialHistoricalResults}={}){
 if(!Array.isArray(report?.pages))throw Error('Invalid official pages');
 const failures=report.pages.filter(p=>p.status==='fetch_failed');
 if(!failures.length)return {...report,retryAttempted:0,retryRecovered:0};
 const replacements=new Map();
 for(const p of failures){
  const key=[p.date,p.venue,p.race].join(':');
  const result=await fetcher({date:p.date,venue:Number(p.venue),races:[Number(p.race)]});
  const next=result?.pages?.[0];
  if(next?.status==='raw_html_saved'&&next.date===p.date&&Number(next.venue)===Number(p.venue)&&Number(next.race)===Number(p.race))
   replacements.set(key,next);
 }
 return {...report,pages:report.pages.map(p=>replacements.get([p.date,p.venue,p.race].join(':'))??p),
  retryAttempted:failures.length,retryRecovered:replacements.size,
  verifiedResults:0,eligibleForHistoricalReplay:0};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts/retry-failed-official-pages.mjs file.json');
 const report=await retryFailedOfficialPages(JSON.parse(fs.readFileSync(file,'utf8')));
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({retryAttempted:report.retryAttempted,retryRecovered:report.retryRecovered,
  saved:report.pages.filter(p=>p.status==='raw_html_saved').length,failed:report.pages.filter(p=>p.status==='fetch_failed').length,verifiedResults:0}));
}
