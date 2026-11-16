// Read-only live probe of an official BOATRACE racelist page.
// This is diagnostic only: no forecasts and no deployment.
import {fetchOfficialRacelist} from './boat-score-2-official.js';
import {extractOfficialMetrics} from './boat-score-2-metric-extractor.js';
import {officialRacelistUrl} from './boat-score-2-official.js';
import {inspectOfficialStructure} from './boat-score-2-html-diagnostics.js';
const date=process.env.PROBE_DATE||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const venue=process.env.PROBE_VENUE||'01';
const race=Number(process.env.PROBE_RACE||'1');
const selection={date,venue,race};
const target=officialRacelistUrl(selection);
if(target.status!=='ok'){console.log(JSON.stringify(target));process.exitCode=1;}
else{
 try{
  const response=await fetch(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(15000)});
  const html=response.ok?await response.text():'';
  const parsed=extractOfficialMetrics(html);
  const structure=inspectOfficialStructure(html);
  const output={date,venue,race,source:target.url,httpStatus:response.status,
   htmlLength:html.length,metricsVerified:parsed.verified,reason:parsed.reason??null,
   racerCount:parsed.racers.length,
   finalUrl:response.url||null,
   contentType:response.headers.get('content-type')||null,
   pageKind:structure.tableCount===0&&structure.totalRacerProfileLinks===0?'non_racelist_html':'potential_racelist',
   structure};
  console.log(JSON.stringify(output,null,2));
  if(!response.ok||!parsed.verified)process.exitCode=1;
 }catch(e){console.error('Probe failed:',String(e?.message||e));process.exitCode=1;}
}
