// Read-only public page diagnostics for Kyoteibiyori racer data availability.
// No bypass, API guessing, personal accounts, bulk scraping or app changes.
import fs from 'node:fs';
const HOST='kyoteibiyori.com';
export function inspectRacerPageHtml(html){
 if(typeof html!=='string')throw Error('HTML string required');
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 const scripts=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(m=>m[1]);
 return {htmlBytes:Buffer.byteLength(html),loadingMessagePresent:text.includes('データ取得中です'),
  recentSixMonthDisclaimer:text.includes('直近6カ月'),registrationNumberLabelPresent:/登録番号|登録No|登番/.test(text),
  externalScriptCount:scripts.filter(s=>/^https?:\/\//.test(s)).length,
  sameOriginScriptCount:scripts.filter(s=>s.startsWith('/')||!/^https?:\/\//.test(s)).length,
  racerRowsIndependentlyConfirmed:false,
  automatedRegistrationSearchConfirmed:false,
  historicalAsOfDataConfirmed:false,
  warning:'Static HTML structure alone does not confirm server-side racer records, registration-number lookup, permission to automate, or historically valid pre-race statistics.'};
}
export async function probePublicRacerPage(date,{fetchImpl=fetch}={}){
 if(typeof date!=='string'||!/^20\d{6}$/.test(date))throw Error('YYYYMMDD required');
 const y=+date.slice(0,4),m=+date.slice(4,6),d=+date.slice(6),check=new Date(Date.UTC(y,m-1,d));
 if(check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)throw Error('Invalid calendar date');
 const url='https://'+HOST+'/racer/racer_today.php?hiduke='+date;
 const response=await fetchImpl(url,{redirect:'error',headers:{accept:'text/html'},signal:AbortSignal.timeout(10000)});
 if(!response.ok||!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('Unexpected page response');
 const html=await response.text();
 if(html.length>1500000)throw Error('HTML too large');
 return {url,date,fetchedAt:new Date().toISOString(),status:response.status,
  ...inspectRacerPageHtml(html),eligibleForHistoricalScoreReplay:false};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [date,output]=process.argv.slice(2);
 if(!date||!output)throw Error('Usage: node scripts/probe-kyoteibiyori-racer-page.mjs <YYYYMMDD> <report.json>');
 const report=await probePublicRacerPage(date);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
